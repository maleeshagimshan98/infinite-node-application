import { databaseDriverLoader } from './database.driver.loader';
import type { IDatabaseConfig } from '@/app/core/config/drivers/database.config';
import { container } from '@/app/core/drivers/service.container';
import type mysql from 'mysql';
// import mongodb from 'mongodb';

// Integration tests (require real DBs)
describe('integration', () => {

  it('should create and register a real MySQL client and perform basic operations', async () => {
    const config: IDatabaseConfig = {
      driverName: 'database',
      driver: 'mysql',
      singleton: true,
      deferred: false,
      params: {
        mysql: {
          driverName: 'mysql',
          singleton: true,
          deferred: false,
          params: {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'infinite-node-application',
            port: '3306',
          },
        },
        mongodb: {
          driverName: 'mongodb',
          singleton: true,
          deferred: false,
          uri: '',
          options: { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false },
        },
      },
    };

    await databaseDriverLoader(container, config);
    
    const client: mysql.Connection = container.resolve('database');
    console.log(client);
    expect(client).toBeDefined();
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
      singleton: true,
      deferred: false,
      driverName: 'database',
      params: {
        mysql: {
          driverName: 'mysql',
          singleton: true,
          deferred: false,
          params: { host: '', user: '', password: '', database: '', port: '' },
        },
        mongodb: {
          driverName: 'mongodb',
          singleton: true,
          deferred: false,
          uri: 'mongodb://localhost:27017/infinite-node-application',
          options: { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false },
        },
      },
    };

    await databaseDriverLoader(container, config);
    const client = container.resolve('database');
    expect(client).toBeDefined();
    // Connect to MongoDB
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
