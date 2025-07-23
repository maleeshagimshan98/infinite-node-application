/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import InfiniteNodeApplication from './src/app/app';
import routes from './src/routes';

try {
    const app = new InfiniteNodeApplication(routes);
    app.listen();
}
catch (error) {
    console.error('Failed to initialize InfiniteNodeApplication:', error);
}