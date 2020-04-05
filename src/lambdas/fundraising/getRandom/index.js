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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    }
  }
}

const donationSchema = new mongoose.Schema(
  {
    fundraisingId: { type: mongoose.Types.ObjectId, required: '{PATH} is required!' },
    fundraiserSwish: { type: String, required: '{PATH} is required!' },
    donatorSwish: { type: String, required: '{PATH} is required!' },
    message: { type: String, required: false },
    amount: { type: Number, required: '{PATH} is required!' },
  },
  { autoIndex: false }
)

const Donation = mongoose.model('Donation', donationSchema)

const fundraisingSchema = new mongoose.Schema(
  {
    fundraiserSwish: { type: String, unique: true },
    story: { type: String, required: '{PATH} is required!' },
    goal: { type: Number, required: '{PATH} is required!' },
    email: { type: String, required: '{PATH} is required!' },
    expirationDate: { type: Date, required: '{PATH} is required!' },
  },
  { autoIndex: false }
)

const Fundraising = mongoose.model('Fundraising', fundraisingSchema)

exports.getRandomFundraising = async () => {

  await getMongoConnection()

  const random = await Fundraising.count().exec((error, count) => {
    return Math.floor(Math.random() * count)
  })

  const fundraising = await Fundraising.findOne().skip(random).lean()
  const donationsAmount = await Donation.find({ fundraisingId: fundraising._id }, 'amount').lean()

  const amountRaised = donationsAmount.reduce((totalRaised, donation) => {
    return totalRaised + donation.amount
  }, 0)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({...fundraising, amountRaised}),
  }
}
