const auditService = require('../services/auditService');

const auditMiddleware = (entityType) => {
  return async (req, res, next) => {
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Capture the original send function
    const originalSend = res.send;
    let responseBody;

    // Override send to capture response
    res.send = function(body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log after response is sent
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = req.params.id || req.body.id;
          const action = req.method.toLowerCase();

          let actionName;
          switch (action) {
            case 'post':
              actionName = 'create';
              break;
            case 'put':
            case 'patch':
              actionName = 'update';
              break;
            case 'delete':
              actionName = 'delete';
              break;
            default:
              actionName = action;
          }

          await auditService.logAction(
            userId,
            actionName,
            entityType,
            entityId,
            {
              request: {
                body: req.body,
                params: req.params,
                query: req.query
              },
              response: responseBody
            },
            ipAddress,
            userAgent
          );
        } catch (error) {
          console.error('Audit middleware error:', error);
        }
      }
    });

    next();
  };
};

module.exports = auditMiddleware;