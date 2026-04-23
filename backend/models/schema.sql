-- ============================================================
-- 儿童美食小程序 - 数据库表结构
-- ============================================================

-- 孩子档案
CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                  -- 姓名
    birthday TEXT,                         -- 出生日期 (YYYY-MM-DD)
    gender TEXT CHECK(gender IN ('男','女')),  -- 性别
    avatar TEXT,                            -- 头像URL
    notes TEXT,                            -- 备注（体质说明等）
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 过敏原类型（全局配置）
CREATE TABLE IF NOT EXISTS allergy_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,            -- 过敏原名称，如"鸡蛋"、"虾"
    category TEXT,                         -- 分类：蛋白质/坚果/乳制品/...
    severity TEXT CHECK(severity IN ('轻度','中度','重度')), -- 严重程度
    description TEXT                       -- 描述说明
);

-- 孩子的过敏原关联
CREATE TABLE IF NOT EXISTS child_allergies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    allergy_type_id INTEGER NOT NULL,
    severity TEXT CHECK(severity IN ('轻度','中度','重度')), -- 个人严重程度
    notes TEXT,                            -- 如"2岁发现"、"轻微症状"
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_type_id) REFERENCES allergy_types(id) ON DELETE CASCADE,
    UNIQUE(child_id, allergy_type_id)
);

-- 孩子不爱吃的食材
CREATE TABLE IF NOT EXISTS child_dislikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    ingredient_id INTEGER,                -- 关联食材表
    ingredient_name TEXT,                  -- 也可直接记名称（简单粗暴）
    reason TEXT,                           -- 原因：味道/口感/曾经不适
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 孩子当前身体状态
CREATE TABLE IF NOT EXISTS child_health_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    illness_id INTEGER,                    -- 关联常见病表
    start_date TEXT,                        -- 开始日期
    end_date TEXT,                         -- 结束日期（空=仍在生病）
    notes TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (illness_id) REFERENCES illnesses(id) ON DELETE SET NULL
);

-- 常见疾病及饮食禁忌
CREATE TABLE IF NOT EXISTS illnesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- 病名：感冒/发烧/腹泻/咳嗽/...
    diet_tips TEXT,                        -- 饮食建议
    avoid_ingredients TEXT,                -- 禁忌食材（逗号分隔的食材名）
    recommend_ingredients TEXT,             -- 推荐食材
    notes TEXT                              -- 其他注意事项
);

-- 食材成分表（核心数据，约200种中国常见食材）
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,             -- 食材名称
    category TEXT,                         -- 分类：蔬菜/肉类/水产/蛋奶/谷物/...
    allergens TEXT,                        -- 包含的过敏原（如"鸡蛋,虾"）
    protein REAL,                          -- 蛋白质 g/100g
    fat REAL,                              -- 脂肪 g/100g
    carbohydrate REAL,                     -- 碳水 g/100g
    calories INTEGER,                       -- 热量 kcal/100g
    vitamin_a REAL,                        -- 维生素A μg/100g
    vitamin_c REAL,                        -- 维生素C mg/100g
    calcium REAL,                          -- 钙 mg/100g
    iron REAL,                             -- 铁 mg/100g
    zinc REAL,                             -- 锌 mg/100g
    is_difficult TEXT CHECK(is_difficult IN ('Y','N')), -- 孩子是否难消化
    notes TEXT                              -- 其他说明（如3岁以下慎食）
);

-- 菜谱表
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- 菜名
    description TEXT,                      -- 简介
    suitable_age TEXT,                      -- 适合年龄，如"1-3岁"
    difficulty TEXT CHECK(difficulty IN ('简单','中等','困难')), -- 难度
    cooking_time INTEGER,                   -- 烹饪时间（分钟）
    steps TEXT,                            -- 步骤（JSON数组）
    tips TEXT,                             -- 烹饪小贴士
    image_url TEXT,                        -- 图片
    created_at TEXT DEFAULT (datetime('now'))
);

-- 菜谱原料关联表
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER,
    ingredient_name TEXT NOT NULL,         -- 原料名称（冗余存储，方便查询）
    amount TEXT,                            -- 用量，如"50g"、"1个"
    notes TEXT,                            -- 备注（如"去皮"）
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
);

-- 每日推荐记录（可选：记录家长做了啥）
CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    recipe_id INTEGER,
    meal_type TEXT CHECK(meal_type IN ('早餐','午餐','晚餐','加餐')),
    logged_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);
