// pages/recipes/recipe-detail/recipe-detail.js
const app = getApp();

Page({
  data: {
    recipe: null,
    check: null,
    childId: null,
    type: null, // suitable / caution / unsuitable
  },

  onLoad(options) {
    const childId = wx.getStorageSync('currentChildId') || 1;
    this.setData({ childId, type: options.type || null });
    this.loadRecipe(options.id, childId);
  },

  async loadRecipe(recipeId, childId) {
    try {
      const [recipeRes, checkRes] = await Promise.all([
        wx.request({ url: `${app.globalData.API_BASE}/recipes/${recipeId}` }),
        wx.request({ url: `${app.globalData.API_BASE}/check-recipe?child_id=${childId}&recipe_id=${recipeId}` }),
      ]);
      this.setData({ recipe: recipeRes.data, check: checkRes.data });
    } catch (e) {
      console.error(e);
    }
  },

  getCheckClass(type) {
    if (!type) return 'default';
    if (type === 'suitable') return 'green';
    if (type === 'caution') return 'yellow';
    if (type === 'unsuitable') return 'red';
    if (this.data.check) {
      if (!this.data.check.suitable) return 'red';
      if (this.data.check.warnings.length > 0) return 'yellow';
      return 'green';
    }
    return 'default';
  }
});
