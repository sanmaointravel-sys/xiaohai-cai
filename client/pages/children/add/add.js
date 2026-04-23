// pages/children/add/add.js
const app = getApp();

Page({
  data: {
    allergyTypes: [],
    illnesses: [],
    selectedIllnessName: '',
    form: {
      name: '',
      birthday: '',
      gender: '男',
      allergies: [],
      dislikesText: '',
      illness_id: null,
      notes: '',
    }
  },

  onLoad() {
    this.loadOptions();
  },

  async loadOptions() {
    const [allergyRes, illnessRes] = await Promise.all([
      wx.request({ url: `${app.globalData.API_BASE}/allergy-types` }),
      wx.request({ url: `${app.globalData.API_BASE}/illnesses` }),
    ]);
    this.setData({
      allergyTypes: allergyRes.data || [],
      illnesses: illnessRes.data || [],
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ 'form.gender': e.detail.value });
  },

  onBirthdayChange(e) {
    this.setData({ 'form.birthday': e.detail.value });
  },

  onIllnessChange(e) {
    const illness = this.data.illnesses[e.detail.value];
    this.setData({
      'form.illness_id': illness.id,
      selectedIllnessName: illness.name,
    });
  },

  toggleAllergy(e) {
    const id = e.currentTarget.dataset.id;
    const allergies = [...this.data.form.allergies];
    const idx = allergies.indexOf(id);
    if (idx === -1) allergies.push(id);
    else allergies.splice(idx, 1);
    this.setData({ 'form.allergies': allergies });
  },

  async submit() {
    const form = this.data.form;
    if (!form.name) return wx.showToast({ title: '请输入姓名', icon: 'none' });

    try {
      // 1. 创建孩子
      const res = await wx.request({
        url: `${app.globalData.API_BASE}/children`,
        method: 'POST',
        data: {
          name: form.name,
          birthday: form.birthday,
          gender: form.gender,
          notes: form.notes,
        }
      });
      const childId = res.data.id;

      // 2. 添加过敏原
      for (const allergyId of form.allergies) {
        await wx.request({
          url: `${app.globalData.API_BASE}/children/${childId}/allergies`,
          method: 'POST',
          data: { allergy_type_id: allergyId }
        });
      }

      // 3. 添加不爱吃的
      if (form.dislikesText) {
        const items = form.dislikesText.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        for (const name of items) {
          await wx.request({
            url: `${app.globalData.API_BASE}/children/${childId}/dislikes`,
            method: 'POST',
            data: { ingredient_name: name }
          });
        }
      }

      // 4. 设置疾病
      if (form.illness_id) {
        await wx.request({
          url: `${app.globalData.API_BASE}/children/${childId}/illness`,
          method: 'POST',
          data: { illness_id: form.illness_id }
        });
      }

      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },
});
