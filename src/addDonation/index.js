const mongoose = require('mongoose')
const { SecretsManager } = require('aws-sdk')

const { MONGO_SECRET_NAME } = process.env

const ssm = new SecretsManager()
mongoose.set('useFindAndModify', false)

const getDbUrl = async () => {
  let secrets

  const encryptedSecretValue = await ssm.getSecretValue({ SecretId: MONGO_SECRET_NAME }).promise()

  if ('SecretString' in encryptedSecretValue) {
    secrets = JSON.parse(String(encryptedSecretValue.SecretString))
  } else {
    const buff = Buffer.from(String(encryptedSecretValue.SecretBinary), 'base64')
    secrets = JSON.parse(buff.toString('ascii'))
  }

  const { MONGO_USERNAME, MONGO_PASSWORD, MONGO_URL } = secrets

  return `mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_URL}`
}

const donationSchema = new mongoose.Schema(
  {
    pledgeId: String,
    message: String,
    amount: Number,
  },
  { autoIndex: false }
)

const Donation = mongoose.model('Donation', donationSchema)

let db = null

exports.addDonation = async (event) => {
  // TODO: gerar code
  const {
    body: { pledgeId, message, amount },
  } = event

  if (!db) {
    try {
      const dbUrl = await getDbUrl()
      const { connection } = await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      db = connection
    } catch (error) {
      return console.error(error)
    }
  }

  await new Donation({ pledgeId, message, amount }).save()
}
