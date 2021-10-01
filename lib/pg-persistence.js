const {dbQuery} = require('./db-query');
const bcrypt = require('bcrypt');

module.exports = class PGPersistence {
  async sortedTodoLists() {
    const ALL_TODOLISTS = 'SELECT * FROM todoLists ORDER BY lower(title) ASC';
    const ALL_TODOS = 'SELECT * FROM todos WHERE todolist_id = $1';

    let result = await dbQuery(ALL_TODOLISTS);
    let todoLists = result.rows;

    for (let index = 0; index < todoLists.length; index += 1) {
      let todoList = todoLists[index];
      let todos = await dbQuery(ALL_TODOS, todoList.id);
      todoList.todos = todos.rows;
    }

    return this._partitionTodoLists(todoLists);
  }

  _partitionTodoLists(todoLists) {
    let undone = [];
    let done = [];
    todoLists.forEach((todoList) => {
      if (this.isDoneTodoList(todoList)) {
        done.push(todoList);
      } else {
        undone.push(todoList);
      }
    });

    return undone.concat(done);
  }

  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every((todo) => todo.done);
  }

  hasUndoneTodos(todoList) {
    return !this.isDoneTodoList(todoList);
  }

  // Find a todo list with the indicated ID. Returns `undefined` if not found.
  // Note that `todoListId` must be numeric.
  async loadTodoList(todoListId) {
    const FIND_TODOLIST = 'SELECT * FROM todolists WHERE id = $1';
    const FIND_TODOS = 'SELECT * FROM todos WHERE todolist_id = $1';

    let resultTodoList = dbQuery(FIND_TODOLIST, todoListId);
    let resultTodos = dbQuery(FIND_TODOS, todoListId);
    let resultBoth = await Promise.all([resultTodoList, resultTodos]);

    let todoList = resultBoth[0].rows[0];
    if (!todoList) return undefined;

    todoList.todos = resultBoth[1].rows;
    return todoList;
  }

  async sortedTodos(todoList) {
    const SORTED_TODOS = 'SELECT * FROM todos' + '  WHERE todolist_id = $1' + '  ORDER BY done ASC, lower(title) ASC';

    let result = await dbQuery(SORTED_TODOS, todoList.id);
    return result.rows;
  }
  // Find a todo with the indicated ID in the indicated todo list. Returns
  // `undefined` if not found. Note that both `todoListId` and `todoId` must be
  // numeric.
  async loadTodo(todoListId, todoId) {
    const FIND_TODO = 'SELECT * FROM todos WHERE todolist_id = $1 AND id = $2';
    let result = await dbQuery(FIND_TODO, todoListId, todoId);
    return result.rows[0];
  }

  async toggleDoneTodo(todoListId, todoId) {
    const TOGGLE_DONE = 'UPDATE todos SET done = NOT done WHERE todolist_id = $1 and id = $2';

    let result = await dbQuery(TOGGLE_DONE, todoListId, todoId);
    return result.rowCount > 0;
  }

  async destroyTodo(todoListId, todoId) {
    const DESTROY_TODO = 'DELETE FROM todos WHERE todolist_id = $1 AND id = $2';
    let result = await dbQuery(DESTROY_TODO, todoListId, todoId);
    return result.rowCount > 0;
  }

  async completeAllTodos(todoListId) {
    const MARK_ALL_DONE = 'UPDATE todos SET done = true WHERE todolist_id = $1';
    let result = await dbQuery(MARK_ALL_DONE, todoListId);
    return result.rowCount > 0;
  }

  async createTodo(todoListId, title) {
    const CREATE_TODO = 'INSERT INTO todos (title, todolist_id) VALUES ($1, $2)';
    let result = await dbQuery(CREATE_TODO, title, todoListId);
    return result.rowCount > 0;
  }

  async deleteTodoList(todoListId) {
    const DELETE_TODOLIST = 'DELETE FROM todolists WHERE id = $1';
    let result = await dbQuery(DELETE_TODOLIST, todoListId);
    return result.rowCount > 0;
  }

  async setTodoListTitle(todoListId, title) {
    const UPDATE_TITLE = 'UPDATE todolists SET title = $1 WHERE id = $2';

    let result = await dbQuery(UPDATE_TITLE, title, todoListId);
    return result.rowCount > 0;
  }

  async existsTodoListTitle(title) {
    const CHECK_TITLE_EXISTS = 'SELECT * FROM todolists WHERE title = $1';
    let result = await dbQuery(CHECK_TITLE_EXISTS, title);

    return result.rowCount > 0;
  }

  isUniqueConstraintViolation(error) {
    return /duplicate key value violates unique constraint/.test(String(error));
  }

  async createTodoList(title) {
    const CREATE_TODOLIST = 'INSERT INTO todolists (title) VALUES ($1)';
    try {
      let result = await dbQuery(CREATE_TODOLIST, title);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error;
    }
  }

  async authenticate(username, password) {
    const FIND_HASHED_PASSWORD = 'SELECT password FROM users WHERE username = $1';

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;
    return bcrypt.compare(password, result.rows[0].password);
  }
};
