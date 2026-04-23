// pages/ingredient-detail/ingredient-detail.js
const app = getApp();

Page({
  data: {
    ingredient: null,
    recipes: [],
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.loadIngredient(id);
      this.loadRecipes(id);
    }
  },

  async loadIngredient(id) {
    const res = await wx.request({
      url: `${app.globalData.API_BASE}/ingredients`
    });
    const list = res.data || [];
    const ing = list.find(i => i.id == id);
    this.setData({ ingredient: ing });
  },

  async loadRecipes(id) {
    // Find recipes containing this ingredient
    const res = await wx.request({ url: `${app.globalData.API_BASE}/recipes` });
    const recipes = (res.data || []).filter(r => {
      const ingText = r.ingredients_text || '';
      const ing = this.data.ingredient;
      if (!ing) return false;
      return ingText.includes(ing.name);
    });
    this.setData({ recipes });
  },

  goToRecipe(e) {
    wx.navigateTo({ url: `/pages/recipes/recipe-detail/recipe-detail?id=${e.currentTarget.dataset.id}` });
  },
});
