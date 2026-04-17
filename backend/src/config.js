import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  reposPath: process.env.REPOS_PATH || './data/repos',
  unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
};
