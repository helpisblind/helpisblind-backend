const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const route53 = require('@aws-cdk/aws-route53')
const apigateway = require('@aws-cdk/aws-apigateway')
const secretsmanager = require('@aws-cdk/aws-secretsmanager')
const route53Targets = require('@aws-cdk/aws-route53-targets')
const certificatemanager = require('@aws-cdk/aws-certificatemanager')

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

    const api = new apigateway.RestApi(this, 'helpisblind-api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS, // this is also the default
      },
    })

    // =======================================================================
    // BEGIN ROUTE53 DEFINITIONS
    // const CERTIFICATE_ARN =
    //   'arn:aws:acm:eu-west-1:072324662457:certificate/c70f1fda-b927-49b7-8fc6-60e2f7b8c53a'

    // const certificate = certificatemanager.Certificate.fromCertificateArn(
    //   this,
    //   'Certificate',
    //   CERTIFICATE_ARN
    // )

    // const domain = new apigateway.DomainName(this, 'domain', {
    //   certificate,
    //   domainName: 'api.helpisblind.se',
    //   mapping: api,
    // })

    // const hostedZone = route53.HostedZone.fromLookup(this, 'hostedZone', {
    //   domainName: 'helpisblind.se',
    // })

    // new route53.ARecord(this, 'AliasRecord', {
    //   zone: hostedZone,
    //   target: route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayDomain(domain)),
    //   recordName: 'api',
    // })
    // END ROUTE53 DEFINITIONS
    // =======================================================================

    // =======================================================================
    // BEGIN FUNDRAISING DEFINITIONS
    const addFundraising = new Lambda(this, 'addFundraising', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/fundraising/add',
    })

    const getRandomFundraising = new Lambda(this, 'getRandomFundraising', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/fundraising/getRandom',
    })

    const fundraising = api.root.addResource('fundraisings')
    fundraising.addMethod('POST', new apigateway.LambdaIntegration(addFundraising))
    fundraising.addMethod('GET', new apigateway.LambdaIntegration(getRandomFundraising))
    // END FUNDRAISING DEFINITIONS
    // =======================================================================

    // =======================================================================
    // BEGIN DONATIONS DEFINITIONS
    const addDonation = new Lambda(this, 'addDonation', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/donation/add',
    })

    const donations = api.root.addResource('donations')
    donations.addMethod('POST', new apigateway.LambdaIntegration(addDonation))

    const getDonationById = new Lambda(this, 'getDonationById', {
      mongoSecret,
      mongoSecretName: MONGO_SECRET_NAME,
      code: './src/donation/getById',
    })

    const donation = donations.addResource('{id}')
    donation.addMethod('GET', new apigateway.LambdaIntegration(getDonationById))
    // END FUNDRAISING DEFINITIONS
    // =======================================================================

    const hostBucket = new s3.Bucket(this, 'hostBucket', {
      bucketName: 'helpisblind-host',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    hostBucket.grantPublicAccess('*', 's3:GetObject')
  }
}

const app = new cdk.App()

const env = { region: 'eu-west-1', account: '072324662457' }

new AppStack(app, 'helpisblind', { env })
