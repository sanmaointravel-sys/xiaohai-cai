// pages/logs/logs.js
const app = getApp();

Page({
  data: {
    currentChild: null,
    todayLogs: [],
    historyLogs: [],
    mealTypes: ['早餐', '午餐', '晚餐', '加餐'],
    selectedMealType: '',
    selectedRecipe: null,
    recipes: [],
    notes: '',
  },

  onLoad() {
    this.setData({ selectedMealType: '早餐' });
  },

  onShow() {
    this.loadCurrentChild();
    this.loadRecipes();
  },

  loadCurrentChild() {
    const childId = wx.getStorageSync('currentChildId');
    if (!childId) return;
    wx.request({
      url: `${app.globalData.API_BASE}/children/${childId}`,
      success: (res) => {
        if (res.data && !res.data.error) {
          this.setData({ currentChild: res.data });
          this.loadLogs(childId);
        }
      }
    });
  },

  async loadRecipes() {
    const res = await wx.request({ url: `${app.globalData.API_BASE}/recipes` });
    this.setData({ recipes: res.data || [] });
  },

  async loadLogs(childId) {
    const res = await wx.request({
      url: `${app.globalData.API_BASE}/children/${childId}/meals`
    });
    const logs = res.data || [];
    const today = new Date().toISOString().slice(0, 10);
    this.setData({
      todayLogs: logs.filter(l => l.logged_at && l.logged_at.startsWith(today)),
      historyLogs: logs.filter(l => !l.logged_at.startsWith(today)),
    });
  },

  onMealTypeChange(e) {
    this.setData({ selectedMealType: this.data.mealTypes[e.detail.value] });
  },

  onRecipeChange(e) {
    this.setData({ selectedRecipe: this.data.recipes[e.detail.value] });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  async addLog() {
    const childId = wx.getStorageSync('currentChildId');
    if (!childId) return wx.showToast({ title: '请先选择孩子', icon: 'none' });
    if (!this.data.selectedMealType) return wx.showToast({ title: '请选择餐次', icon: 'none' });

    await wx.request({
      url: `${app.globalData.API_BASE}/children/${childId}/meals`,
      method: 'POST',
      data: {
        meal_type: this.data.selectedMealType,
        recipe_id: this.data.selectedRecipe ? this.data.selectedRecipe.id : null,
        notes: this.data.notes,
      }
    });
    wx.showToast({ title: '记录成功', icon: 'success' });
    this.loadLogs(childId);
    this.setData({ notes: '', selectedRecipe: null });
  },

  async deleteLog(e) {
    const id = e.currentTarget.dataset.id;
    const childId = wx.getStorageSync('currentChildId');
    try {
      await wx.request({
        url: `${app.globalData.API_BASE}/children/${childId}/meals/${id}`,
        method: 'DELETE'
      });
    } catch(e) {}
    const today = new Date().toISOString().slice(0,10);
    this.setData({
      todayLogs: this.data.todayLogs.filter(l => l.id !== id),
      historyLogs: this.data.historyLogs.filter(l => l.id !== id),
    });
  },

  goToChildren() {
    wx.switchTab({ url: '/pages/children/children' });
  },
});
