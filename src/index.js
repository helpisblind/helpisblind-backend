const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const ssm = require('@aws-cdk/aws-secretsmanager')

const { Lambda } = require('./presets/lambda')

class AppStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    const MONGO_SECRET_NAME = 'MONGO_SECRETS'

    const mongoSecret = new ssm.Secret(this, 'mongoSecrets', {
      secretName: MONGO_SECRET_NAME,
      description: 'mongodb authentication credentials',
      generateSecretString: {
        generateStringKey: '_id',
        secretStringTemplate: JSON.stringify({
          MONGO_USERNAME: '',
          MONGO_PASSWORD: '',
          MONGO_URL: '',
        }),
      },
    })

    new Lambda(this, 'addPledge', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/addPledge',
    })

    new Lambda(this, 'addDonation', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/addDonation',
    })

    const hostBucket = new s3.Bucket(this, 'hostBucket', {
      bucketName: 'helpisblind-host',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
    })

    hostBucket.grantPublicAccess('*', 's3:GetObject')
  }
}

const app = new cdk.App()

const env = { region: 'eu-west-1' }

new AppStack(app, 'helpisblind', { env })
