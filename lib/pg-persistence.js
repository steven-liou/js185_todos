const {dbQuery} = require('./db-query');

module.exports = class PGPersistence {
  constructor(session) {
    // this._todoLists = session.todoLists || deepCopy(SeedData);
    // session.todoLists = this._todoLists;
  }

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
    //     let todoLists = deepCopy(this._todoLists);
    //     let undone = todoLists.filter((todoList) => !this.isDoneTodoList(todoList));
    //     let done = todoLists.filter((todoList) => this.isDoneTodoList(todoList));
    //     return sortTodoLists(undone, done);
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
  loadTodo(todoListId, todoId) {
    // return deepCopy(this._findTodo(todoListId, todoId));
  }

  _findTodoList(todoListId) {
    // return this._todoLists.find((todoList) => todoList.id === todoListId);
  }

  _findTodo(todoListId, todoId) {
    // let todoList = this._findTodoList(todoListId);
    // if (!todoList) return undefined;
    // return todoList.todos.find((todo) => todo.id === todoId);
  }

  toggleDoneTodo(todoListId, todoId) {
    // let todo = this._findTodo(todoListId, todoId);
    // if (!todo) return false;
    // todo.done = !todo.done;
    // return true;
  }

  destroyTodo(todoListId, todoId) {
    // let todoList = this._findTodoList(todoListId);
    // if (!todoList) return false;
    // let todoIndex = todoList.todos.findIndex((todo) => todo.id === todoId);
    // if (todoIndex === -1) return false;
    // todoList.todos.splice(todoIndex, 1);
    // return true;
  }

  completeAllTodos(todoListId) {
    // let todoList = this._findTodoList(todoListId);
    // if (!todoList) return false;
    // todoList.todos.forEach((todo) => (todo.done = true));
    // return true;
  }

  createTodo(todoListId, title) {
    // let todoList = this._findTodoList(todoListId);
    // if (!todoList) return false;
    // todoList.todos.push({
    //   title,
    //   id: nextId(),
    //   done: false,
    // });
    // return true;
  }

  deleteTodoList(todoListId) {
    // let todoListIndex = this._findTodoListIndex(todoListId);
    // if (todoListIndex === -1) return false;
    // this._todoLists.splice(todoListIndex, 1);
    // return true;
  }

  _findTodoListIndex(todoListId) {
    // return this._todoLists.findIndex((list) => list.id === todoListId);
  }

  renameTodoList(todoListId, title) {
    // let todoList = this._findTodoList(todoListId);
    // if (!todoList) return false;
    // todoList.title = title;
    // return true;
  }

  existsTodoListTitle(title) {
    // return this._todoLists.some((todoList) => todoList.title === title);
  }

  createTodoList(title) {
    // this._todoLists.push({
    //   id: nextId(),
    //   title,
    //   todos: [],
    // });
    // return true;
  }
};
