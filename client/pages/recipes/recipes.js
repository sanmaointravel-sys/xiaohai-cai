// pages/recipes/recipes.js
const app = getApp();

Page({
  data: {
    recipes: [],
    filter: 'all', // all / suitable / caution / unsuitable
    loading: true,
  },

  onLoad() {
    this.loadRecipes();
  },

  async loadRecipes() {
    this.setData({ loading: true });
    const res = await wx.request({ url: `${app.globalData.API_BASE}/recipes` });
    this.setData({ recipes: res.data || [], allRecipes: res.data || [], loading: false });
  },

  onSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    const all = this.data.allRecipes || [];
    if (!keyword) {
      this.setData({ recipes: all });
      return;
    }
    this.setData({
      recipes: all.filter(r =>
        r.name.toLowerCase().includes(keyword) ||
        (r.ingredients_text && r.ingredients_text.toLowerCase().includes(keyword))
      )
    });
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipes/recipe-detail/recipe-detail?id=${id}` });
  },
});
