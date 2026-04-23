// app.js
const API_BASE = 'http://localhost:5000/api';

App({
  globalData: {
    API_BASE,
    currentChild: null,
  },

  onLaunch() {
    // 检查是否有选中的孩子
    const childId = wx.getStorageSync('currentChildId');
    if (childId) {
      this.loadCurrentChild(childId);
    }
  },

  async loadCurrentChild(childId) {
    try {
      const res = await wx.request({
        url: `${API_BASE}/children/${childId}`,
        method: 'GET'
      });
      if (res.data && !res.data.error) {
        this.globalData.currentChild = res.data;
      }
    } catch (e) {
      console.error('加载孩子信息失败', e);
    }
  },
});
