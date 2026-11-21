import { env } from './config/env';
import app from './app';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} in ${env.NODE_ENV} mode`);
});
