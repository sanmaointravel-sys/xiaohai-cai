// pages/index/index.js
const app = getApp();

Page({
  data: {
    children: [],
    currentChild: null,
    suitableRecipes: [],
    cautionRecipes: [],
    unsuitableRecipes: [],
    loading: true,
  },

  onLoad() {
    this.loadChildren();
  },

  onShow() {
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await wx.request({ url: `${app.globalData.API_BASE}/children` });
      const children = res.data || [];
      this.setData({ children });

      const currentId = wx.getStorageSync('currentChildId');
      if (currentId && children.length > 0) {
        const current = children.find(c => c.id === currentId);
        if (current) {
          this.setData({ currentChild: current });
          this.loadRecipes(current.id);
        } else {
          this.setData({ loading: false });
        }
      } else if (children.length > 0) {
        this.selectChild(children[0]);
      } else {
        this.setData({ loading: false });
      }
    } catch (e) {
      wx.showToast({ title: '后端未启动，请先运行 app.py', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async selectChild(child) {
    wx.setStorageSync('currentChildId', child.id);
    app.globalData.currentChild = child;
    this.setData({ currentChild: child, loading: true });
    await this.loadRecipes(child.id);
  },

  async loadRecipes(childId) {
    try {
      const res = await wx.request({
        url: `${app.globalData.API_BASE}/recipes/suitable/${childId}`,
        method: 'GET',
      });
      const data = res.data;
      this.setData({
        suitableRecipes: data.suitable || [],
        cautionRecipes: data.caution || [],
        unsuitableRecipes: data.unsuitable || [],
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goToChildren() {
    wx.switchTab({ url: '/pages/children/children' });
  },

  goToRecipes() {
    wx.switchTab({ url: '/pages/recipes/recipes' });
  },

  goToRecipe(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/recipes/recipe-detail/recipe-detail?id=${id}&type=${type}` });
  },
});
