const mongoose = require('mongoose')
const { SecretsManager } = require('aws-sdk')

const { MONGO_SECRET_NAME } = process.env

const ssm = new SecretsManager()
mongoose.set('useFindAndModify', false)

let mongo = null

const getMongoURL = async () => {
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

const getMongoConnection = async () => {
  if (!mongo) {
    try {
      const mongoURL = await getMongoURL()

      const { connection } = await mongoose.connect(mongoURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })

      mongo = connection
    } catch (error) {
      console.error(error)
      return {
        statusCode: 500,
      }
    }
  }
}

const donationSchema = new mongoose.Schema(
  {
    fundraiserSwish: String,
    donatorSwish: String,
    message: String,
    amount: Number,
  },
  { autoIndex: false }
)

const Donation = mongoose.model('Donation', donationSchema)

exports.addDonation = async (event) => {
  const {
    body: { fundraiserSwish, donatorSwish, message, amount },
  } = event

  await getMongoConnection()

  const donation = await new Donation({ fundraiserSwish, donatorSwish, message, amount }).save()

  return {
    statusCode: 201,
    body: JSON.stringify(donation),
  }
}
