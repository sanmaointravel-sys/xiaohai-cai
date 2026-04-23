// pages/children/children.js
const app = getApp();

Page({
  data: {
    children: [],
    showAddModal: false,
    allergyTypes: [],
    illnesses: [],
    editingChild: null,
    // 添加/编辑表单
    form: { name: '', birthday: '', gender: '', notes: '', allergies: [], dislikes: '', illness: null }
  },

  onLoad() {
    this.loadChildren();
    this.loadOptions();
  },

  async loadChildren() {
    const res = await wx.request({ url: `${app.globalData.API_BASE}/children` });
    this.setData({ children: res.data || [] });
  },

  async loadOptions() {
    const [allergyRes, illnessRes] = await Promise.all([
      wx.request({ url: `${app.globalData.API_BASE}/allergy-types` }),
      wx.request({ url: `${app.globalData.API_BASE}/illnesses` }),
    ]);
    this.setData({ allergyTypes: allergyRes.data, illnesses: illnessRes.data });
  },

  openAddModal() {
    this.setData({
      showAddModal: true,
      editingChild: null,
      form: { name: '', birthday: '', gender: '男', notes: '', allergies: [], dislikes: '', illness: null }
    });
  },

  closeModal() {
    this.setData({ showAddModal: false });
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  toggleAllergy(type) {
    const allergies = this.data.form.allergies;
    const idx = allergies.indexOf(type);
    if (idx === -1) allergies.push(type);
    else allergies.splice(idx, 1);
    this.setData({ 'form.allergies': allergies });
  },

  async submitChild() {
    const form = this.data.form;
    if (!form.name) return wx.showToast({ title: '请输入孩子姓名', icon: 'none' });

    try {
      // 创建孩子
      const res = await wx.request({
        url: `${app.globalData.API_BASE}/children`,
        method: 'POST',
        data: { name: form.name, birthday: form.birthday, gender: form.gender, notes: form.notes }
      });
      const childId = res.data.id;

      // 添加过敏原
      for (const allergyId of form.allergies) {
        await wx.request({
          url: `${app.globalData.API_BASE}/children/${childId}/allergies`,
          method: 'POST',
          data: { allergy_type_id: allergyId }
        });
      }

      // 设置疾病（如有）
      if (form.illness) {
        await wx.request({
          url: `${app.globalData.API_BASE}/children/${childId}/illness`,
          method: 'POST',
          data: { illness_id: form.illness }
        });
      }

      wx.showToast({ title: '添加成功', icon: 'success' });
      this.closeModal();
      this.loadChildren();
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  async selectChild(e) {
    const childId = e.currentTarget.dataset.id;
    wx.setStorageSync('currentChildId', childId);
    wx.switchTab({ url: '/pages/index/index' });
  },

  async deleteChild(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后数据无法恢复',
      success: async (res) => {
        if (res.confirm) {
          await wx.request({
            url: `${app.globalData.API_BASE}/children/${id}`,
            method: 'DELETE'
          });
          this.loadChildren();
        }
      }
    });
  },

  async setIllness(e) {
    const { childId, illnessId } = e.currentTarget.dataset;
    await wx.request({
      url: `${app.globalData.API_BASE}/children/${childId}/illness`,
      method: 'POST',
      data: { illness_id: illnessId }
    });
    wx.showToast({ title: '已设置', icon: 'success' });
    this.loadChildren();
  },

  async clearIllness(e) {
    const childId = e.currentTarget.dataset.id;
    await wx.request({
      url: `${app.globalData.API_BASE}/children/${childId}/illness`,
      method: 'DELETE'
    });
    this.loadChildren();
  }
});
