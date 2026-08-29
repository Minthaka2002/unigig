-- Creates a separate database per microservice (database-per-service pattern)
CREATE DATABASE auth_db;
CREATE DATABASE task_db;
CREATE DATABASE matching_db;
CREATE DATABASE pricing_db;

GRANT ALL PRIVILEGES ON DATABASE auth_db TO unigig;
GRANT ALL PRIVILEGES ON DATABASE task_db TO unigig;
GRANT ALL PRIVILEGES ON DATABASE matching_db TO unigig;
GRANT ALL PRIVILEGES ON DATABASE pricing_db TO unigig;
