const cdk = require('@aws-cdk/core')
const lambda = require('@aws-cdk/aws-lambda')

class Lambda extends lambda.Function {
  constructor(scope, id, props) {
    const { mongoSecret, mongoSecretName, code } = props

    const func = new lambda.Function(scope, id, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.asset(code),
      handler: `index.${id}`,
      environment: {
        MONGO_SECRET_NAME: mongoSecretName,
      },
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(60),
    })

    mongoSecret.grantRead(func)

    return func
  }
}

module.exports = { Lambda }
