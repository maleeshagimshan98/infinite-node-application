import { dbServiceLoader } from './db.service.loader';
import type { IDatabaseConfig } from '../../config/service/database.config';
import type { AwilixContainer } from 'awilix';
import { createContainer } from 'awilix';
import type mysql from 'mysql';
// import mongodb from 'mongodb';

// Integration tests (require real DBs)
describe('integration', () => {
  let container: AwilixContainer;

  beforeEach(() => {
    container = createContainer();
  });

  it('should create and register a real MySQL client and perform basic operations', async () => {
    const config: IDatabaseConfig = {
      driver: 'mysql',
      deffered: false,
      mysql: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'infinite-node-application',
      },
      mongodb: {
        uri: '',
        options: { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false },
      },
    };

    dbServiceLoader(container, config);
    const client: mysql.Connection = container.resolve('dbClient');
    expect(client).toBeDefined();
    await client.connect();
    await client.query('CREATE TABLE IF NOT EXISTS test_table (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255))');
    await client.query('INSERT INTO test_table (name) VALUES (?)', ['Alice']);
    await new Promise((resolve, reject) => {
      client.query('SELECT * FROM test_table WHERE name = ?', ['Alice'], (err, results) => {
        if (err) return reject(err);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Alice');
        resolve(undefined);
      });
    });
    await client.end();
  });

  it('should create and register a real MongoDB client and perform basic operations', async () => {
    const config: IDatabaseConfig = {
      driver: 'mongodb',
      deffered: false,
      mysql: { host: '', user: '', password: '', database: '' },
      mongodb: {
        uri: 'mongodb://localhost:27017/infinite-node-application',
        options: { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false },
      },
    };

    dbServiceLoader(container, config);
    const client = container.resolve('dbClient');
    expect(client).toBeDefined();
    // Connect to MongoDB
    await client.connect();
    const db = client.db('infinite-node-application');
    const collection = db.collection('test_collection');

    // Insert a document
    const insertResult = await collection.insertOne({ name: 'Bob', age: 30 });
    expect(insertResult.insertedId).toBeDefined();

    // Retrieve the document
    const foundDoc = await collection.findOne({ name: 'Bob' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('Bob');
    expect(foundDoc?.age).toBe(30);
    await client.close();
  });
});
