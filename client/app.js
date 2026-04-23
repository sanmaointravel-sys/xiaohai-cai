// app.js
// TODO: 把下面改成你电脑的局域网IP，比如 http://192.168.x.x:5000/api
// 获取本机IP方法: Windows CMD输入 ipconfig，找到IPv4地址
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
