const db = require('../models')

const DEFAULT_SETTINGS = {
  websiteName: 'SimpleIncome',
  websiteUrl: 'https://simpleincome.in',
  paymentUpiName: 'SimpleIncome UPI',
  analystName: 'Lead Analyst',
  telegramApiUrl: 'https://api.telegram.org',
  whatsappApiUrl: 'https://api.whatsapp.com',
  supportEmail: '',
  supportPhone: '',
  paymentUpiHandle: '',
  privacyPolicyUrl: '',
  termsUrl: '',
  maintenanceMode: false
}

async function ensureTable() {
  await db.Setting.sync({ alter: true })
}

async function getOrInitSettings() {
  await ensureTable()
  let setting = await db.Setting.findOne()
  if (!setting) {
    setting = await db.Setting.create(DEFAULT_SETTINGS)
  }
  return setting
}

const settingsController = {
  async getSettings(req, res) {
    try {
      const setting = await getOrInitSettings()
      res.json({ success: true, data: setting })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async updateSettings(req, res) {
    try {
      const setting = await getOrInitSettings()
      const fields = ['websiteName','websiteUrl','paymentUpiName','analystName','telegramApiUrl','whatsappApiUrl','supportEmail','supportPhone','paymentUpiHandle','privacyPolicyUrl','termsUrl','maintenanceMode']
      for (const f of fields) {
        if (req.body[f] !== undefined) setting[f] = req.body[f]
      }
      await setting.save()
      res.json({ success: true, data: setting })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async resetSettings(req, res) {
    try {
      await ensureTable()
      let setting = await db.Setting.findOne()
      if (!setting) {
        setting = await db.Setting.create(DEFAULT_SETTINGS)
      } else {
        await setting.update(DEFAULT_SETTINGS)
      }
      res.json({ success: true, data: setting })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = { settingsController }
