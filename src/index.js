const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const apigateway = require('@aws-cdk/aws-apigateway')
const secretsmanager = require('@aws-cdk/aws-secretsmanager')

const { Lambda } = require('./presets/lambda')

class AppStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    const MONGO_SECRET_NAME = 'MONGO_SECRETS'

    const mongoSecret = new secretsmanager.Secret(this, 'mongoSecrets', {
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

    const api = new apigateway.RestApi(this, 'helpisblind-api', {})

    const addPledge = new Lambda(this, 'addPledge', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/pledge/add',
    })

    const getRandomPledge = new Lambda(this, 'getRandomPledge', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/pledge/getRandom',
    })

    const pledge = api.root.addResource('pledge')
    pledge.addMethod('POST', new apigateway.LambdaIntegration(addPledge))
    pledge.addMethod('GET', new apigateway.LambdaIntegration(getRandomPledge))

    const addDonation = new Lambda(this, 'addDonation', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/addDonation',
    })

    const donation = api.root.addResource('donation')
    donation.addMethod('POST', new apigateway.LambdaIntegration(addDonation))

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
