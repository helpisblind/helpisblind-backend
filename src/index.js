const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const lambda = require('@aws-cdk/aws-lambda')
const ssm = require('@aws-cdk/aws-secretsmanager')

class AppStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    const MONGO_SECRET_NAME = 'MONGO_SECRETS'

    const mongoSecrets = new ssm.Secret(this, 'mongoSecrets', {
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

    const addPledge = new lambda.Function(this, 'addPledge', {
      description: 'Add pledge to the database',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.asset('./src/addPledge'),
      handler: 'index.add',
      environment: {
        MONGO_SECRET_NAME,
      },
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(60),
    })
    mongoSecrets.grantRead(addPledge)

    const addDonation = new lambda.Function(this, 'addDonation', {
      description: 'Add pledge to the database',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.asset('./src/addDonation'),
      handler: 'index.add',
      environment: {
        MONGO_SECRET_NAME,
      },
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(60),
    })
    mongoSecrets.grantRead(addDonation)

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
