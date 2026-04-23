"""
小孩菜 - Flask 后端 API
帮家长快速判断一道菜适不适合孩子
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)
DATABASE = os.path.join(os.path.dirname(__file__), 'xiaohai.db')

# ============================================================
# 数据库连接
# ============================================================
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def dict_from_row(row):
    if row is None:
        return None
    return dict(zip(row.keys(), row))

# ============================================================
# 初始化数据库
# ============================================================
def init_db():
    db = sqlite3.connect(DATABASE)
    with open(os.path.join(os.path.dirname(__file__), 'models/schema.sql'), encoding='utf-8') as f:
        db.executescript(f.read())
    with open(os.path.join(os.path.dirname(__file__), 'data/seed_data.sql'), encoding='utf-8') as f:
        db.executescript(f.read())
    db.commit()
    db.close()
    print("✅ 数据库初始化完成")

# ============================================================
# 辅助函数
# ============================================================
def get_allergens_for_recipe(db, recipe_id):
    """获取菜谱的所有过敏原（通过食材关联）"""
    rows = db.execute("""
        SELECT i.allergens FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_name = i.name
        WHERE ri.recipe_id = ?
    """, (recipe_id,)).fetchall()
    allergens = set()
    for row in rows:
        if row[0]:
            for a in row[0].split(','):
                a = a.strip()
                if a:
                    allergens.add(a)
    return list(allergens)

def check_recipe_for_child(db, child_id, recipe_id):
    """核心函数：检查某道菜是否适合某个孩子"""
    result = {
        'suitable': True,
        'reasons': [],
        'warnings': [],
        'recommendations': []
    }

    # 1. 检查过敏原
    child_allergies = db.execute("""
        SELECT at.name FROM child_allergies ca
        JOIN allergy_types at ON ca.allergy_type_id = at.id
        WHERE ca.child_id = ?
    """, (child_id,)).fetchall()
    child_allergen_names = {row[0] for row in child_allergies}

    recipe_allergens = get_allergens_for_recipe(db, recipe_id)
    matched_allergens = child_allergen_names & set(recipe_allergens)
    if matched_allergens:
        result['suitable'] = False
        result['reasons'].append(f"⚠️ 含有过敏原: {', '.join(matched_allergens)}")

    # 2. 检查不爱吃的食材
    dislikes = db.execute("""
        SELECT cd.ingredient_name FROM child_dislikes cd WHERE cd.child_id = ?
    """, (child_id,)).fetchall()
    dislike_names = {row[0] for row in dislikes}
    recipe_ingredients = db.execute("""
        SELECT ingredient_name FROM recipe_ingredients WHERE recipe_id = ?
    """, (recipe_id,)).fetchall()
    matched_dislikes = dislike_names & {row[0] for row in recipe_ingredients}
    if matched_dislikes:
        result['warnings'].append(f"🚫 含有孩子不爱吃的: {', '.join(matched_dislikes)}")

    # 3. 检查当前疾病禁忌
    active_illness = db.execute("""
        SELECT illness_id FROM child_health_status
        WHERE child_id = ? AND end_date IS NULL
    """, (child_id,)).fetchall()

    if active_illness:
        illness_ids = [row[0] for row in active_illness if row[0]]
        if illness_ids:
            placeholders = ','.join('?' * len(illness_ids))
            illnesses = db.execute(f"""
                SELECT name, avoid_ingredients, recommend_ingredients FROM illnesses WHERE id IN ({placeholders})
            """, illness_ids).fetchall()

            recipe_ing_names = {row[0] for row in recipe_ingredients}
            for illness in illnesses:
                if illness[1]:
                    avoid_list = [x.strip() for x in illness[1].split(',')]
                    matched_avoid = recipe_ing_names & set(avoid_list)
                    if matched_avoid:
                        result['suitable'] = False
                        result['reasons'].append(f"🤒 {illness[0]}期间不宜: {', '.join(matched_avoid)}")
                if illness[2]:
                    recommend = [x.strip() for x in illness[2].split(',')]
                    result['recommendations'].append(f"{illness[0]}推荐: {', '.join(recommend)}")

    # 4. 整体推荐理由（适合的话）
    if result['suitable'] and not result['warnings']:
        recipe = db.execute("SELECT name FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
        result['reasons'].append(f"✅ {recipe['name']} 可以给孩子吃")

    return result

# ============================================================
# API 路由
# ============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '1.0.0'})

# --- 孩子档案 ---
@app.route('/api/children', methods=['GET'])
def list_children():
    db = get_db()
    children = db.execute('SELECT * FROM children ORDER BY created_at DESC').fetchall()
    return jsonify([dict_from_row(c) for c in children])

@app.route('/api/children', methods=['POST'])
def create_child():
    data = request.json
    db = get_db()
    cursor = db.execute("""
        INSERT INTO children (name, birthday, gender, notes)
        VALUES (?, ?, ?, ?)
    """, (data.get('name'), data.get('birthday'), data.get('gender'), data.get('notes')))
    db.commit()
    child = db.execute('SELECT * FROM children WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify(dict_from_row(child)), 201

@app.route('/api/children/<int:child_id>', methods=['GET'])
def get_child(child_id):
    db = get_db()
    child = db.execute('SELECT * FROM children WHERE id = ?', (child_id,)).fetchone()
    if not child:
        return jsonify({'error': '孩子不存在'}), 404

    allergies = db.execute("""
        SELECT at.* FROM child_allergies ca
        JOIN allergy_types at ON ca.allergy_type_id = at.id
        WHERE ca.child_id = ?
    """, (child_id,)).fetchall()

    dislikes = db.execute('SELECT * FROM child_dislikes WHERE child_id = ?', (child_id,)).fetchall()

    illness_status = db.execute("""
        SELECT chs.*, i.name as illness_name, i.diet_tips
        FROM child_health_status chs
        LEFT JOIN illnesses i ON chs.illness_id = i.id
        WHERE chs.child_id = ? AND chs.end_date IS NULL
    """, (child_id,)).fetchall()

    return jsonify({
        **dict_from_row(child),
        'allergies': [dict_from_row(a) for a in allergies],
        'dislikes': [dict_from_row(d) for d in dislikes],
        'active_illness': [dict_from_row(i) for i in illness_status]
    })

@app.route('/api/children/<int:child_id>', methods=['PUT'])
def update_child(child_id):
    data = request.json
    db = get_db()
    db.execute("""
        UPDATE children SET name=?, birthday=?, gender=?, notes=?, updated_at=datetime('now')
        WHERE id=?
    """, (data.get('name'), data.get('birthday'), data.get('gender'), data.get('notes'), child_id))
    db.commit()
    child = db.execute('SELECT * FROM children WHERE id = ?', (child_id,)).fetchone()
    return jsonify(dict_from_row(child))

@app.route('/api/children/<int:child_id>', methods=['DELETE'])
def delete_child(child_id):
    db = get_db()
    db.execute('DELETE FROM children WHERE id = ?', (child_id,))
    db.commit()
    return jsonify({'success': True})

# --- 过敏原 ---
@app.route('/api/allergy-types', methods=['GET'])
def list_allergy_types():
    db = get_db()
    types = db.execute('SELECT * FROM allergy_types ORDER BY name').fetchall()
    return jsonify([dict_from_row(t) for t in types])

@app.route('/api/children/<int:child_id>/allergies', methods=['POST'])
def add_child_allergy(child_id):
    data = request.json
    db = get_db()
    db.execute("""
        INSERT OR IGNORE INTO child_allergies (child_id, allergy_type_id, severity, notes)
        VALUES (?, ?, ?, ?)
    """, (child_id, data.get('allergy_type_id'), data.get('severity'), data.get('notes')))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/children/<int:child_id>/allergies/<int:allergy_id>', methods=['DELETE'])
def remove_child_allergy(child_id, allergy_id):
    db = get_db()
    db.execute('DELETE FROM child_allergies WHERE child_id=? AND allergy_type_id=?', (child_id, allergy_id))
    db.commit()
    return jsonify({'success': True})

# --- 不爱吃的食材 ---
@app.route('/api/children/<int:child_id>/dislikes', methods=['GET'])
def list_child_dislikes(child_id):
    db = get_db()
    dislikes = db.execute('SELECT * FROM child_dislikes WHERE child_id = ?', (child_id,)).fetchall()
    return jsonify([dict_from_row(d) for d in dislikes])

@app.route('/api/children/<int:child_id>/dislikes', methods=['POST'])
def add_child_dislike(child_id):
    data = request.json
    db = get_db()
    db.execute("""
        INSERT INTO child_dislikes (child_id, ingredient_id, ingredient_name, reason)
        VALUES (?, ?, ?, ?)
    """, (child_id, data.get('ingredient_id'), data.get('ingredient_name'), data.get('reason')))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/children/<int:child_id>/dislikes/<int:dislike_id>', methods=['DELETE'])
def remove_child_dislike(child_id, dislike_id):
    db = get_db()
    db.execute('DELETE FROM child_dislikes WHERE id=? AND child_id=?', (dislike_id, child_id))
    db.commit()
    return jsonify({'success': True})

# --- 疾病状态 ---
@app.route('/api/illnesses', methods=['GET'])
def list_illnesses():
    db = get_db()
    illnesses = db.execute('SELECT * FROM illnesses ORDER BY name').fetchall()
    return jsonify([dict_from_row(i) for i in illnesses])

@app.route('/api/children/<int:child_id>/illness', methods=['POST'])
def set_child_illness(child_id):
    data = request.json
    db = get_db()
    # 先结束之前的疾病
    db.execute("""
        UPDATE child_health_status SET end_date = datetime('now')
        WHERE child_id = ? AND end_date IS NULL
    """, (child_id,))
    db.execute("""
        INSERT INTO child_health_status (child_id, illness_id, start_date, notes)
        VALUES (?, ?, ?, ?)
    """, (child_id, data.get('illness_id'), data.get('start_date', datetime.now().strftime('%Y-%m-%d')), data.get('notes')))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/children/<int:child_id>/illness', methods=['DELETE'])
def clear_child_illness(child_id):
    db = get_db()
    db.execute("""
        UPDATE child_health_status SET end_date = datetime('now')
        WHERE child_id = ? AND end_date IS NULL
    """, (child_id,))
    db.commit()
    return jsonify({'success': True})

# --- 菜谱 ---
@app.route('/api/recipes', methods=['GET'])
def list_recipes():
    db = get_db()
    recipes = db.execute("""
        SELECT r.*,
            (SELECT GROUP_CONCAT(ri.ingredient_name) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) as ingredients_text
        FROM recipes r ORDER BY r.id
    """).fetchall()
    return jsonify([dict_from_row(r) for r in recipes])

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    db = get_db()
    recipe = db.execute('SELECT * FROM recipes WHERE id = ?', (recipe_id,)).fetchone()
    if not recipe:
        return jsonify({'error': '菜谱不存在'}), 404

    ingredients = db.execute("""
        SELECT ri.*, i.allergens, i.protein, i.fat, i.carbohydrate, i.calories,
               i.vitamin_a, i.vitamin_c, i.calcium, i.iron, i.zinc
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_name = i.name
        WHERE ri.recipe_id = ?
    """, (recipe_id,)).fetchall()

    return jsonify({
        **dict_from_row(recipe),
        'ingredients': [dict_from_row(i) for i in ingredients]
    })

# --- 核心：检查菜谱是否适合孩子 ---
@app.route('/api/check-recipe', methods=['GET'])
def check_recipe():
    child_id = request.args.get('child_id', type=int)
    recipe_id = request.args.get('recipe_id', type=int)
    if not child_id or not recipe_id:
        return jsonify({'error': '缺少 child_id 或 recipe_id'}), 400

    db = get_db()
    result = check_recipe_for_child(db, child_id, recipe_id)
    return jsonify(result)

# --- 批量筛选：找出孩子能吃的所有菜 ---
@app.route('/api/recipes/suitable/<int:child_id>', methods=['GET'])
def list_suitable_recipes(child_id):
    db = get_db()
    recipes = db.execute('SELECT * FROM recipes ORDER BY id').fetchall()
    results = []
    for recipe in recipes:
        check = check_recipe_for_child(db, child_id, recipe['id'])
        results.append({
            'id': recipe['id'],
            'name': recipe['name'],
            'suitable_age': recipe['suitable_age'],
            'difficulty': recipe['difficulty'],
            'cooking_time': recipe['cooking_time'],
            'check': check
        })

    # 按适合程度排序
    suitable = [r for r in results if r['check']['suitable'] and not r['check']['warnings']]
    caution = [r for r in results if r['check']['suitable'] and r['check']['warnings']]
    unsuitable = [r for r in results if not r['check']['suitable']]

    return jsonify({
        'suitable': suitable,
        'caution': caution,
        'unsuitable': unsuitable
    })

# --- 食材库 ---
@app.route('/api/ingredients', methods=['GET'])
def list_ingredients():
    db = get_db()
    category = request.args.get('category')
    if category:
        ingredients = db.execute('SELECT * FROM ingredients WHERE category = ? ORDER BY name', (category,)).fetchall()
    else:
        ingredients = db.execute('SELECT * FROM ingredients ORDER BY category, name').fetchall()
    return jsonify([dict_from_row(i) for i in ingredients])

@app.route('/api/ingredient-categories', methods=['GET'])
def list_ingredient_categories():
    db = get_db()
    categories = db.execute('SELECT DISTINCT category FROM ingredients ORDER BY category').fetchall()
    return jsonify([row[0] for row in categories])

# --- 每日记录 ---
@app.route('/api/children/<int:child_id>/meals', methods=['GET'])
def list_meals(child_id):
    db = get_db()
    meals = db.execute("""
        SELECT ml.*, r.name as recipe_name
        FROM meal_logs ml
        LEFT JOIN recipes r ON ml.recipe_id = r.id
        WHERE ml.child_id = ?
        ORDER BY ml.logged_at DESC LIMIT 30
    """, (child_id,)).fetchall()
    return jsonify([dict_from_row(m) for m in meals])

@app.route('/api/children/<int:child_id>/meals', methods=['POST'])
def log_meal(child_id):
    data = request.json
    db = get_db()
    db.execute("""
        INSERT INTO meal_logs (child_id, recipe_id, meal_type, notes)
        VALUES (?, ?, ?, ?)
    """, (child_id, data.get('recipe_id'), data.get('meal_type'), data.get('notes')))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/children/<int:child_id>/meals/<int:meal_id>', methods=['DELETE'])
def delete_meal_log(child_id, meal_id):
    db = get_db()
    db.execute('DELETE FROM meal_logs WHERE id=? AND child_id=?', (meal_id, child_id))
    db.commit()
    return jsonify({'success': True})

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
