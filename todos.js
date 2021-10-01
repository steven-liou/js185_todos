const express = require('express');
const morgan = require('morgan');
const flash = require('express-flash');
const session = require('express-session');
const {body, validationResult} = require('express-validator');
const store = require('connect-loki');
const PgPersistence = require('./lib/pg-persistence');
const catchError = require('./lib/catch-error');

const app = express();
const host = 'localhost';
const port = 3000;
const LokiStore = store(session);

app.set('views', './views');
app.set('view engine', 'pug');

app.use(morgan('common'));
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(
  session({
    cookie: {
      httpOnly: true,
      maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
      path: '/',
      secure: false,
    },
    name: 'launch-school-todos-session-id',
    resave: false,
    saveUninitialized: true,
    secret: 'this is not very secure',
    store: new LokiStore({}),
  })
);

app.use(flash());

// Create a new datastore
app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Redirect start page
app.get('/', (req, res) => {
  res.redirect('/lists');
});

// Render the list of todo lists
app.get(
  '/lists',
  catchError(async (req, res, next) => {
    let store = res.locals.store;
    let todoLists = await store.sortedTodoLists();

    let todosInfo = todoLists.map((todoList) => {
      return {
        countAllTodos: todoList.todos.length,
        countDoneTodos: todoList.todos.filter((todo) => todo.done).length,
        isDone: store.isDoneTodoList(todoList),
      };
    });
    res.render('lists', {
      todoLists,
      todosInfo,
    });
  })
);

// Render new todo list page
app.get('/lists/new', (req, res) => {
  res.render('new-list');
});

// Create a new todo list
app.post(
  '/lists',
  [
    // code omitted
  ],
  (req, res, next) => {
    let errors = validationResult(req);
    let todoListTitle = req.body.todoListTitle;

    const rerenderNewList = () => {
      res.render('new-list', {
        todoListTitle,
        flash: req.flash(),
      });
    };

    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash('error', message.msg));
      rerenderNewList();
    } else if (res.locals.store.existsTodoListTitle(todoListTitle)) {
      req.flash('error', 'The list title must be unique.');
      rerenderNewList();
    } else {
      let created = res.locals.store.createTodoList(todoListTitle);
      if (!created) {
        next(new Error('Failed to create todo list.'));
      } else {
        req.flash('success', 'The todo list has been created.');
        res.redirect('/lists');
      }
    }
  }
);

// Render individual todo list and its todos
app.get(
  '/lists/:todoListId',
  catchError(async (req, res, next) => {
    let todoListId = req.params.todoListId;
    let todoList = await res.locals.store.loadTodoList(+todoListId);

    if (todoList === undefined) {
      throw new Error('Not Found.');
    } else {
      todoList.todos = await res.locals.store.sortedTodos(todoList);
      res.render('list', {
        isDoneTodoList: res.locals.store.isDoneTodoList(todoList),
        hasUndoneTodos: res.locals.store.hasUndoneTodos(todoList),
        todoList: todoList,
      });
    }
  })
);

// Toggle completion status of a todo
app.post('/lists/:todoListId/todos/:todoId/toggle', (req, res, next) => {
  let store = res.locals.store;
  let {todoListId, todoId} = {...req.params};
  [todoListId, todoId] = [+todoListId, +todoId];
  let toggled = store.toggleDoneTodo(todoListId, todoId);
  if (!toggled) {
    next(new Error('Not found.'));
  } else {
    let todo = store.loadTodoList(todoListId, todoId);
    let title = todo.title;
    if (todo.done) {
      req.flash('success', `"${title}" marked as NOT done!`);
    } else {
      req.flash('success', `"${title}" marked done.`);
    }

    res.redirect(`/lists/${todoListId}`);
  }
});

// Delete a todo
app.post('/lists/:todoListId/todos/:todoId/destroy', (req, res, next) => {
  let {todoListId, todoId} = {...req.params};

  let destroyed = res.locals.store.destroyTodo(+todoListId, +todoId);
  if (!destroyed) {
    next(new Error('Not found.'));
  } else {
    req.flash('success', 'The todo has been deleted.');
    res.redirect(`/lists/${todoListId}`);
  }
});

// Mark all todos as done
app.post('/lists/:todoListId/complete_all', (req, res, next) => {
  let todoListId = req.params.todoListId;
  let allDone = res.locals.store.completeAllTodos(+todoListId);
  if (!allDone) {
    next(new Error('Not found.'));
  } else {
    req.flash('success', 'All todos have been marked as done.');
    res.redirect(`/lists/${todoListId}`);
  }
});

// Create a new todo and add it to the specified list
app.post(
  '/lists/:todoListId/todos',
  [
    body('todoTitle')
      .trim()
      .isLength({min: 1})
      .withMessage('The todo title is required.')
      .isLength({max: 100})
      .withMessage('Todo title must be between 1 and 100 characters.'),
  ],
  (req, res, next) => {
    let store = res.locals.store;
    let todoListId = +req.params.todoListId;
    let todoList = store.loadTodoList(todoListId);
    if (!todoList) {
      next(new Error('Not found.'));
    } else {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach((message) => req.flash('error', message.msg));
        todoList.todos = store.sortedTodos(todoList);

        res.render('list', {
          todoList,
          isDoneTodoList: store.isDoneTodoList(todoList),
          hasUndoneTodos: store.hasUndoneTodos(todoList),
          flash: req.flash(),
          todoTitle: req.body.todoTitle,
        });
      } else {
        let created = store.createTodo(todoListId, req.body.todoTitle);
        if (!created) {
          next(new Error('Not found.'));
        } else {
          req.flash('success', 'The todo has been created.');
          res.redirect(`/lists/${todoListId}`);
        }
      }
    }
  }
);

// Render edit todo list form
app.get('/lists/:todoListId/edit', (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = res.locals.store.loadTodoList(+todoListId);
  if (!todoList) {
    next(new Error('Not found.'));
  } else {
    res.render('edit-list', {todoList});
  }
});

// Delete todo list
app.post('/lists/:todoListId/destroy', (req, res, next) => {
  // let todoLists = req.session.todoLists;
  let todoListId = +req.params.todoListId;
  // let index = todoLists.findIndex((todoList) => todoList.id === todoListId);
  let deleted = res.locals.store.deleteTodoList(todoListId);
  if (!deleted) {
    next(new Error('Not found.'));
  } else {
    req.flash('success', 'Todo list deleted.');
    res.redirect('/lists');
  }
});

// Edit todo list title
app.post(
  '/lists/:todoListId/edit',
  [
    // omitted code
  ],
  (req, res, next) => {
    let store = res.locals.store;
    let todoListId = req.params.todoListId;
    let todoListTitle = req.body.todoListTitle;

    const rerenderEditList = () => {
      let todoList = store.loadTodoList(+todoListId);
      if (!todoList) {
        next(new Error('Not found.'));
      } else {
        res.render('edit-list', {
          todoListTitle,
          todoList,
          flash: req.flash(),
        });
      }
    };

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash('error', message.msg));
      rerenderEditList();
    } else if (res.locals.store.existsTodoListTitle(todoListTitle)) {
      req.flash('error', 'The list title must be unique.');
      rerenderEditList();
    } else if (!res.locals.store.setTodoListTitle(+todoListId, todoListTitle)) {
      next(new Error('Not found.'));
    } else {
      req.flash('success', 'Todo list updated.');
      res.redirect(`/lists/${todoListId}`);
    }
  }
);

// Listener
app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});
