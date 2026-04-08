'use strict';

/**
 * hexo server：将 /admin 重定向到 /admin/，避免无尾部斜杠时 404
 */
hexo.extend.filter.register(
  'server_middleware',
  (app) => {
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.url === '/admin') {
        res.writeHead(302, { Location: '/admin/' });
        res.end();
        return;
      }
      next();
    });
  },
  1
);
