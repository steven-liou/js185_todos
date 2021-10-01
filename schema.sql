
CREATE TABLE todolists (
  id serial PRIMARY KEY,
  title varchar(100) UNIQUE NOT NULL
);

CREATE TABLE todos (
  id serial PRIMARY KEY,
  title varchar(100) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  todolist_id INTEGER NOT NULL
  REFERENCES todolists(id)
  ON DELETE CASCADE
);


CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL
);
