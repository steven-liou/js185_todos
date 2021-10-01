const SeedData = require('./seed-data');
const deepCopy = require('./deep-copy');
const {sortTodoLists, sortTodos} = require('./sort');
const nextId = require('./next-id');

module.exports = class SessionPersistence {
  constructor(session) {
    this._todoLists = session.todoLists || deepCopy(SeedData);
    session.todoLists = this._todoLists;
  }

  sortedTodoLists() {
    let todoLists = deepCopy(this._todoLists);
    let undone = todoLists.filter((todoList) => !this.isDoneTodoList(todoList));
    let done = todoLists.filter((todoList) => this.isDoneTodoList(todoList));

    return sortTodoLists(undone, done);
  }

  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every((todo) => todo.done);
  }

  hasUndoneTodos(todoList) {
    return !this.isDoneTodoList(todoList);
  }

  // Find a todo list with the indicated ID. Returns `undefined` if not found.
  // Note that `todoListId` must be numeric.
  loadTodoList(todoListId) {
    return deepCopy(this._findTodoList(todoListId));
  }

  sortedTodos(todoList) {
    let undone = todoList.todos.filter((todo) => !todo.done);
    let done = todoList.todos.filter((todo) => todo.done);
    return deepCopy(sortTodos(undone, done));
  }
  // Find a todo with the indicated ID in the indicated todo list. Returns
  // `undefined` if not found. Note that both `todoListId` and `todoId` must be
  // numeric.
  loadTodo(todoListId, todoId) {
    return deepCopy(this._findTodo(todoListId, todoId));
  }

  _findTodoList(todoListId) {
    return this._todoLists.find((todoList) => todoList.id === todoListId);
  }

  _findTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return undefined;
    return todoList.todos.find((todo) => todo.id === todoId);
  }

  toggleDoneTodo(todoListId, todoId) {
    let todo = this._findTodo(todoListId, todoId);
    if (!todo) return false;
    todo.done = !todo.done;
    return true;
  }

  destroyTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    let todoIndex = todoList.todos.findIndex((todo) => todo.id === todoId);
    if (todoIndex === -1) return false;
    todoList.todos.splice(todoIndex, 1);
    return true;
  }

  completeAllTodos(todoListId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    todoList.todos.forEach((todo) => (todo.done = true));
    return true;
  }

  createTodo(todoListId, title) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    todoList.todos.push({
      title,
      id: nextId(),
      done: false,
    });
    return true;
  }

  deleteTodoList(todoListId) {
    let todoListIndex = this._findTodoListIndex(todoListId);
    if (todoListIndex === -1) return false;
    this._todoLists.splice(todoListIndex, 1);
    return true;
  }

  _findTodoListIndex(todoListId) {
    return this._todoLists.findIndex((list) => list.id === todoListId);
  }

  renameTodoList(todoListId, title) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;
    todoList.title = title;
    return true;
  }

  existsTodoListTitle(title) {
    return this._todoLists.some((todoList) => todoList.title === title);
  }

  createTodoList(title) {
    this._todoLists.push({
      id: nextId(),
      title,
      todos: [],
    });
    return true;
  }

  isUniqueConstraintViolation(_error) {
    return false;
  }
};
