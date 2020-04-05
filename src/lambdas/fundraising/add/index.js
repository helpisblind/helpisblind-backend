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

exports.addFundraising = async (event) => {
  const { fundraiserSwish, story, goal, email } = JSON.parse(event.body)

  await getMongoConnection()

  const now = new Date()
  const expirationDate = new Date(now.setMonth(now.getMonth() + 1))

  const fundraising = await Fundraising.create({
    fundraiserSwish,
    story,
    goal,
    email,
    expirationDate,
  })

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(fundraising),
  }
}
