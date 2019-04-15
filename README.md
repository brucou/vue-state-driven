# Motivation
User interfaces are reactive systems which can be modelized accurately by state machines. There 
is a number of state machine libraries in the field with varying design objectives. We have proposed
 an extended state machine library with a minimal API, architected around a single causal, 
 effect-less function. This particular design requires integration with the interfaced 
 systems, in order to produce the necessary effects (user events, system events, user actions). We
  present here an integration of our [proposed machine library](https://github.com/brucou/state-transducer) with `Vue`. 

This document is structured as follows :

- we quickly present the rationale behind modelling user interfaces with state machines and the 
resulting architecture
- we continue with our API design goals
- we finally explain and document the actual API together with a [simple example](#example) of use, 
taken from other similar libraries

# Modelling user interfaces with state machines
We are going all along to refer to a image search application example to illustrate our 
argumentation. Cf. [Example section](#example) for more details.

In a traditional architecture, a simple scenario would be expressed as follows :

![image search basic scenario](assets/Image%20search%20scenario.png)

What we can derive from that is that the application is interfacing with other systems : the user
 interface and what we call external systems (local storage, databases, etc.). The application 
 responsibility is to translate user actions on the user interface into commands on the external systems, execute those commands and deal with their result.

In our proposed architecture, the same scenario would become :

![image search basic scenario](assets/Image%20search%20scenario%20with%20fsm.png)

In that architecture, the application is refactored into a mediator, a preprocessor, a state 
machine, a command handler, and an effect handler. The application is thus split into smaller parts 
which address specific concerns :
- the preprocessor translates user interface events into inputs for the state machine
- the state machine computes the commands to execute as a result of its present and past inputs, 
or, what is equivalent, its present input and current state 
- the command handler interprets and executes incoming commands, delegating the execution of 
effects to the effect handler when necessary
- the mediator orchestrates the user interface, the preprocessor, the state machine and the command 
handler

While the architecture may appear more complex (isolating concerns means more parts), we have 
reduced the complexity born from the interconnection between the parts. 

Concretely, we increased the testability of our implementation :
- the mediator algorithm is the same independently of the pieces it coordinates. This means it 
can be written and tested once, then reused at will. This is our `<Machine />` component. **This is
 glue code that you do not have to write and test anymore**
- effect handlers are pretty generic pieces of code. An example could be code to fetch a 
resource. That code is written and tested once (and comes generally tested out of the box), and 
then reused for any resource. Additionally, only the effect handlers can perform effects on the 
external systems, which helps testing, tracing and debugging[^3]
- effect handlers, being isolated in their own module, are easy to mock, without resorting to 
a complex machinery specific to a testing library
- the state machine is a function which **performs no effects**, and whose output exclusively depends 
on current state, and present input[^2]. We will use the term *causal* functions for such 
functions, in  reference to [causal systems](https://en.wikipedia.org/wiki/Causal_system), which 
exhibit the same property[^1]. The causality property means state machines are a breeze
 to reason about and test (well, not as much as pure functions, but infinitely better than 
 effectful functions)
- only the preprocessor and mediator can perform effects on the user interface, which helps 
testing, tracing and debugging 

We also have achieved greater modularity: our parts are coupled only through their interface. For instance, we use in our example below `Rxjs` for preprocessing events, and [`state-transducer`](https://github.com/brucou/state-transducer) as state machine library. We could easily switch to [`most`](https://github.com/cujojs/most) and [`xstate`](https://github.com/davidkpiano/xstate)
 if the need be, or to a barebone event emitter (like [`emitonoff`](https://github.com/konsumer/emitonoff)) by simply building interface adapters.
 
There are more benefits but this is not the place to go about them. Cf:
- [User interfaces as reactive systems](https://brucou.github.io/posts/user-interfaces-as-reactive-systems/)
- [Pure UI](https://rauchg.com/2015/pure-ui)
- [Pure UI control](https://medium.com/@asolove/pure-ui-control-ac8d1be97a8d)

[^3]: Command handlers can only perform effects internally (for instance async. communication 
with the mediator)    
[^2]: In relation with state machines, it is the same to say that 
      an output depends exclusively on past and present inputs and that an output exclusively depends 
      on current state, and present input.    
[^1]: Another term used elsewhere is *deterministic* functions, but we 
      found that term could be confusing.          

# Installation
```sh
npm install
```

# Code examples
For the impatient ones, you can directly review the available demos:
 
| Code playground | Machine | Screenshot |  
|:----|:----:|:----:|
|[password meter](https://codesandbox.io/s/l9o1qknoz7)| ![graph](https://github.com/brucou/state-transducer/raw/master/assets/password%20submit%20fsm.png)| ![password meter demo](https://github.com/brucou/state-transducer/raw/master/assets/password%20selector%20demo%20animated.png)|
|[flickr image search](https://codesandbox.io/s/rryx27pppq)| ![](./assets/image%20gallery%20state%20cat.png)| ![image search interface](https://i.imgur.com/mDQQTX8.png?1) |


# API design goals
We want to have an integration which is generic enough to accommodate a large set of use cases, 
and specific enough to be able to take advantage as much as possible of the `Vue` ecosystem 
and API. Unit-testing should ideally be based on the specifications of the behaviour of the 
component rather than its implementation details, and leverage the automatic test generator of 
the underlying `state-tranducer` library. In particular :

- it should be possible to use without risk of interference standard Vue features
- non-Vue functionalities should be coupled only through interfaces, allowing to use any 
suitable implementation
- the specifics of the implementation should not impact testing

As a result of these design goals :
- we defined interfaces for extended state updates (reducer interface), event processing 
(observer and observable interfaces).
- any state machine implementation can be substituted to our library provided that it respects 
the machine interface and contracts: 
  - the machine is implemented by a function
  - it takes an unique input parameter of the shape `{[event name]: event data}`
  - it returns an array of commands
  - it produces no effects
- we use dependency injection to pass the modules responsible for effects to the `<Machine />` component

# API
## ` makeVueStateMachine({name, renderWith, props, fsm, eventHandler, preprocessor, commandHandlers, effectHandlers, options, Vue })`

### Description
We expose a `makeVueStateMachine` Vue component factory which will return  Vue component which 
implements the user interface specified by the parameters the factory receives. The parameters 
are as follows:

- `name`: the name for the Vue component to be created
- `props`: the *props* that the `renderWith` component accepts
- `renderWith`: the Vue component which will be used to render the user interface
  - Note that the `renderWith` must declare the same `props`, plus a `next` *prop* as `props`
  - `next` is a subject which is injected and connects to the preprocessor
- `fsm`: the state machine which specifies the user interface behaviour
- `eventHandler`: as of now `eventHandler.subjectFactory` is a factory with no parameters which 
returns a subject, i.e. an object which implements the observer and observable interface. That 
subject is used by the machine to received inputs/events from the interfaced systems.  
- `preprocessor`: the preprocessor translates events into machine inputs
- `commandHandlers`: specifies how to handle commands issued by the state machine
- `effectHandlers`: specifies how to perform effects. The `` object is passed to all command 
handlers so they may delegate the execution of effects. This in turn allows for easy mocking and 
testing.
- `options`: miscellaneous customizing options (such as debug, initial event). 
- `Vue`: `Vue` object to be injected into the Vue component factory

The created `Vue` component expects some props but does not expect children components. 

### Example
To showcase usage of our react component with our machine library, we will implement an [image 
search application](https://css-tricks.com/robust-react-user-interfaces-with-finite-state-machines/#article-header-id-5). 
That application basically takes an input from the user, looks up images related
 to that search input, and displays it. The user can then click on a particular image to see it 
 in more details. 

For illustration, the user interface starts like this :

![image search interface](https://i.imgur.com/mDQQTX8.png?1) 

[Click here](https://codesandbox.io/s/rryx27pppq) for a live demo.

The user interface behaviour can be modelized by the following machine:

![machine visualization](assets/image%20gallery%20state%20cat.png)

Let's see how to integrate that into a Vue codebase using our factory.

#### Encoding the machine graph
The machine is translated into the data structure expected by the supporting `state-transducer` 
library:

```javascript
import { NO_OUTPUT } from "state-transducer";
import { COMMAND_SEARCH, NO_ACTIONS, NO_STATE_UPDATE } from "./properties";
import { applyJSONpatch, renderAction, renderGalleryApp } from "./helpers";

export const imageGalleryFsmDef = {
  events: [
    "START",
    "SEARCH",
    "SEARCH_SUCCESS",
    "SEARCH_FAILURE",
    "CANCEL_SEARCH",
    "SELECT_PHOTO",
    "EXIT_PHOTO"
  ],
  states: { init: "", start: "", loading: "", gallery: "", error: "", photo: "" },
  initialControlState: "init",
  initialExtendedState: {
    query: "",
    items: [],
    photo: undefined,
    gallery: ""
  },
  transitions: [
    { from: "init", event: "START", to: "start", action: NO_ACTIONS },
    { from: "start", event: "SEARCH", to: "loading", action: NO_ACTIONS },
    {
      from: "loading",
      event: "SEARCH_SUCCESS",
      to: "gallery",
      action: (extendedState, eventData, fsmSettings) => {
        const items = eventData;

        return {
          updates: [{ op: "add", path: "/items", value: items }],
          outputs: NO_OUTPUT
        };
      }
    },
    {
      from: "loading",
      event: "SEARCH_FAILURE",
      to: "error",
      action: NO_ACTIONS
    },
    {
      from: "loading",
      event: "CANCEL_SEARCH",
      to: "gallery",
      action: NO_ACTIONS
    },
    { from: "error", event: "SEARCH", to: "loading", action: NO_ACTIONS },
    { from: "gallery", event: "SEARCH", to: "loading", action: NO_ACTIONS },
    {
      from: "gallery",
      event: "SELECT_PHOTO",
      to: "photo",
      action: (extendedState, eventData, fsmSettings) => {
        const item = eventData;

        return {
          updates: [{ op: "add", path: "/photo", value: item }],
          outputs: NO_OUTPUT
        };
      }
    },
    { from: "photo", event: "EXIT_PHOTO", to: "gallery", action: NO_ACTIONS }
  ],
  entryActions: {
    loading: (extendedState, eventData, fsmSettings) => {
      const { items, photo } = extendedState;
      const query = eventData;
      const searchCommand = {
        command: COMMAND_SEARCH,
        params: query
      };
      const renderGalleryAction = renderAction({ query, items, photo, gallery: "loading" });

      return {
        outputs: [searchCommand].concat(renderGalleryAction.outputs),
        updates: NO_STATE_UPDATE
      };
    },
    photo: renderGalleryApp("photo"),
    gallery: renderGalleryApp("gallery"),
    error: renderGalleryApp("error"),
    start: renderGalleryApp("start")
  },
  updateState: applyJSONpatch,
}
```

Note: 
- how the black bullet (entry point) from our machine graph corresponds to a `init` control 
state, which moves to the `start` control state with the initial event `START`.
- `events` and `states` respectively are a list of events and control states accepted and 
represented in the machine
- `initialControlState` and `initialExtendedState` encode the initial state for the machine
- the `transitions` property of the machine encodes the edges of the graph that modelizes the 
behaviour of the interface
- every control state entry will lead to displaying some screens. In order not to repeat that 
logic, we extract it into the `entryActions` property and we will use later the corresponding 
`state-transducer` plugin which makes use of this data
- `updateState` specifies how to update the extended state of the machine from a description of 
the updates to perform. We use [JSON patch](http://jsonpatch.com/) in our example. In this 
context, a patch of `updates: [{ op: "add", path: "/photo", value: item }],` will entail adding 
`item` in lieu of the `photo` property of the patched object. A redux-like reducer, proxy-based 
`immer.js` or any user-provided function could also be used, as long as it respects the defined interface.

#### A stateless component to render the user interface
The machine **controls** the user interface via the issuing of render commands, which include 
*props* for a user-provided Vue component. Here, those *props* are fed into `GalleryApp`, which
 renders the interface: 
 
 ```javascript
<template>
    <div class=".ui-app" v-bind:data-state="gallery">
        <Form v-bind:galleryState="gallery"
              v-bind:onSubmit="onSubmit"
              v-bind:onClick="onCancelClick">
        </Form>>
        <Gallery v-bind:galleryState="gallery"
                 v-bind:items="items"
                 v-bind:onClick="onGalleryClick">
        </Gallery>
        <Photo v-bind:galleryState="gallery"
               v-bind:photo="photo"
               v-bind:onClick="onPhotoClick">
        </Photo>
    </div>
</template>

<script>
  import Form from "./Form";
  import Gallery from "./Gallery";
  import Photo from "./Photo";

  export default {
    props : ["query", "photo", "items", "gallery", "next"],
    components: {
      Form,
      Gallery,
      Photo,
    },
    methods: {
      // reminder : do not use fat arrow functions!
      onSubmit: function(ev, formRef) {
        return this.next(["onSubmit", ev, formRef]);
      },
      onCancelClick: function(ev) {
        return this.next(["onCancelClick"])
      },
      onGalleryClick: function(item) {
        return this.next(["onGalleryClick", item]);
      },
      onPhotoClick: function(ev) {
        return this.next(["onPhotoClick"]);
      },
    }
  };
</script>

```

Note:
- `GalleryApp` is a **stateless component** which only concerns itself with rendering 
the interface. The interface state concerns (representation, storage, retrieval, update, etc.) are 
handled by the state machine.

#### Implementing the user interface 
We have our state machine defined, we have a component to render the user interface. We now have 
to implement the full user interface, e.g. processing events, and execute the appropriate 
commands in response. As we will use the `makeVueStateMachine` factory, we have to 
specify the corresponding *props* for it. Those *props* include, as the architecture indicates, 
an interface by which the user interface sends events to a preprocessor which transforms them 
into inputs for the state machine, which produces commands which are processed by command 
handlers, which delegate the actual effect execution to effect handlers: 

```javascript
import { COMMAND_SEARCH, NO_INTENT } from "./properties"
import {COMMAND_RENDER} from "vue-state-driven"
import { INIT_EVENT } from "state-transducer"
import  GalleryApp from "./GalleryApp"
import { destructureEvent, runSearchQuery } from "./helpers"
import { filter, map } from "rxjs/operators"
import { Subject } from "rxjs"

const stateTransducerRxAdapter = {
  subjectFactory: () => new Subject()
};

export const imageGalleryVueMachineDef = {
  props: ["query", "photo", "items", "gallery"],
  options: { initialEvent: ["START"] },
  renderWith: GalleryApp,
  eventHandler: stateTransducerRxAdapter,
  preprocessor: rawEventSource =>
    rawEventSource.pipe(
      map(ev => {
        const { rawEventName, rawEventData: e, ref } = destructureEvent(ev);

        if (rawEventName === INIT_EVENT) {
          return { [INIT_EVENT]: void 0 };
        }
        // Form raw events
        else if (rawEventName === "START") {
          return { START: void 0 };
        } else if (rawEventName === "onSubmit") {
          e.preventDefault();
          return { SEARCH: ref.current.value };
        } else if (rawEventName === "onCancelClick") {
          return { CANCEL_SEARCH: void 0 };
        }
        // Gallery
        else if (rawEventName === "onGalleryClick") {
          const item = e;
          return { SELECT_PHOTO: item };
        }
        // Photo detail
        else if (rawEventName === "onPhotoClick") {
          return { EXIT_PHOTO: void 0 };
        }
        // System events
        else if (rawEventName === "SEARCH_SUCCESS") {
          const items = e;
          return { SEARCH_SUCCESS: items };
        } else if (rawEventName === "SEARCH_FAILURE") {
          return { SEARCH_FAILURE: void 0 };
        }

        return NO_INTENT;
      }),
      filter(x => x !== NO_INTENT),
    ),
  commandHandlers: {
    [COMMAND_SEARCH]: (next, query, effectHandlers) => {
      effectHandlers
        .runSearchQuery(query)
        .then(data => {
          next(["SEARCH_SUCCESS", data.items]);
        })
        .catch(error => {
          next(["SEARCH_FAILURE", void 0]);
        });
    }
  },
  effectHandlers: {
    runSearchQuery: runSearchQuery,
    [COMMAND_RENDER]: (machineComponent, params, next) => {
      const props = Object.assign({}, params, { next, hasStarted: true });
      machineComponent.set(props);
    }
  }
};

``` 

Note:
- we render the user interface with the `GalleryApp` component (`renderWith`)
- we use Rxjs (`stateTransducerRxAdapter`) for event handling between the component and the 
interfaced systems
- we kick start the machine with the `START` event (`options.initialEvent`)
- inputs received from the interfaced systems (network responses or user inputs) are translated 
into inputs for the state machine by the preprocessor (`preprocessor`)
- our interface only performs two actions on its interfaced systems : rendering screens, and 
querying remote content. As the rendering command is implemented by the `makeVueStateMachine` factory, 
`commandHandlers` only implement the `COMMAND_SEARCH` command (`commandHandlers`).
- the `COMMAND_SEARCH` command use the `runSearchQuery` effect runner (`effectHandlers`)
- the render command can be customized if necessary by specifying an alternative render 
implementation. Here for educational purposes, we reproduced the default render handler.

#### The final application set-up
We now have all the pieces to integrate for our application:

```javascript
import Vue from 'vue'
import { createStateMachine, decorateWithEntryActions, fsmContracts } from "state-transducer";
import { makeVueStateMachine } from "vue-state-driven";
import { imageGalleryVueMachineDef } from "./imageGalleryVueMachineDef";
import { imageGalleryFsmDef } from "./fsm"
import "./index.css";
import "./gallery.css";

Vue.config.productionTip = false

const fsmSpecsWithEntryActions = decorateWithEntryActions(
  imageGalleryFsmDef,
  imageGalleryFsmDef.entryActions,
  null
);
const fsm = createStateMachine(
  fsmSpecsWithEntryActions,
  { debug: { console, checkContracts: fsmContracts } }
);

makeVueStateMachine(Object.assign({ Vue, name: 'App', fsm }, imageGalleryVueMachineDef));

/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<App/>'
})

```

Note:
- `decorateWithEntryActions` which a plugin which allows to have a given machine produce 
predefined actions on entering a control state. We use it here to render a given screen on entry 
in a given control state. 
- debug options can be configured as needed. Currently trace messages can be output to a `console` 
passed by the API user. Additionally, machine contracts can be checked (useful in development mode) 

### A typical machine run
Alright, now let's leverage the example to explain the factory semantics.

Our state machine is basically a function which takes an input and returns outputs. The inputs 
received by the machine are meant to be mapped to events triggered by the user through the user 
interface. The outputs from the machine are commands representing what commands/effects to perform 
on the interfaced system(s). The mapping between user/system events and machine input is 
performed by `preprocessor`. The commands output by the machine are mapped to handlers gathered 
in `commandHandlers` so our Vue component knows how to run a command when it receives one.

A run of the machine would then be like this :
- The machine will encapsulate the following properties as part of its extended state : `query`, 
`items`, `photo`. This extended state will be updated according to the machine specifications in 
function of the input received by the machine and the control state the machine is in.  
- The initial extended state is `{ query: '', items: [], photo: undefined }`
- The machine transitions automatically from the initial state to the `start` control state
  - on doing so, it issues one command : render `GalleryApp`. Render commands have a default 
  handler which renders the `renderWith` Vue component passed as parameter with the *props* 
  included in the command. An  event emitter (`next` in code sample above) is passed as *prop* to allow for the element to send events to the state 
  machine
- The component executes the render command and renders a gallery app with an empty 
query text input, no images(`items`), and no selected image (`photo`)
- The user enters some text in the text input
- The user clicks the `Search` button. 
  - A `submit` event is triggered
  - The value of the input field is read, and the `submit` event is transformed into a 
  machine input `{SEARCH : <query>}` which is passed to the machine
  - The machine, per its specifications, outputs two commands : `COMMAND_SEARCH` and render 
  `GalleryApp`, and transitions to `loading` control state 
  - The component executes the two commands : the gallery is rendered (this time with a
   `Cancel` button appearing), and an API call is made. Depending on the eventual result of that 
   API call, the command handler will trigger a `SEARCH_SUCCESS` or `SEARCH_FAILURE` event.
- The search is successful : the `SEARCH_SUCCESS` event is transformed into a machine 
input `{SEARCH_SUCCESS: items}`. 
  - The machine, per its specifications, updates its extended state `items` property, and outputs
   a render `GalleryApp` command. This displays the list of fetched items on the screen.
- Any further event will lead to the same sequence : 
  - the user or an interfaced system (network, etc.) triggers an event X,
  - that event will be transformed into a machine input (as per `preprocessor`), 
  - the machine will, as per its specs, update its extended state and issue command(s) 
  - Issued commands will be executed, as per `commandHandlers`

This is it! Whatever the machine passed as parameter to the `makeVueStateMachine` factory, its 
behaviour will always be as described.

Note that this example is contrived for educational purposes:
- we could do away with the preprocessor and have the DOM event handlers directly produce inputs in 
the format accepted by the machine
- we could handle concurrency issues (user makes a second search while the first search request 
is in-flight) either reusing rxjs capabilities (`switchMap`) or at the machine level (extra piece
 of state)

### Types
Types contracts can be found in the [repository](https://github.com/brucou/react-state-driven/tree/master/types). 

### Contracts
- command handlers delegate **all effects on external systems** through the effect handler module
- the `COMMAND_RENDER` command is reserved and must not be used in the command handlers' 
specifications
- types contracts
- `next` is injected as a *prop* to the `renderWith` component and as such cannot be overriden by 
the component's defined *props*

### Semantics
- The Vue component created by the `makeVueStateMachine` factory:
  - initializes the raw event source (subject) which receives and forwards all raw events 
  (user events and system events)
  - creates a global command handler to dispatch to user-defined command handlers
  - connects the raw event source to the preprocessor
  - connects the preprocessor to the machine
  - connects the machine to the command handler
  - starts the machine: the machine is now reactive to raw events and computes the associated commands
- The preprocessor will receive raw events from two sources : the user interface and the external
 systems (databases, etc.). From raw events, it will compute inputs for the connected state 
 machine. Note that:
  - the preprocessor may perform effects only on the user interface (for instance `e => e.preventDefault()`)
  - the preprocessor may have its own internal state
- The machine receives preprocessed events from the preprocessor and computes a set of commands 
to be executed
- The global command handler execute the incoming commands :
  - if the command is a render command, the global handler executes directly the command with the
   default render handler
  - if the command is not a render command, the global handler dispatches the command to the 
  user-configured command handlers
- All command handlers are passed two arguments : 
  - an event emitter connected to the raw event source
  - an object of type `EffectHandlers` which contains any relevant dependencies needed to 
  perform effects (that is the object passed in parameter to the `makeVueStateMachine` factory)
- The `renderWith` Vue component may have DOM event handlers. Those event 
  handlers can pass their raw events (DOM events) to the machine thanks to the raw event source 
  emitter `next` injected as *prop*
- Non-render commands leads to the execution of procedures which may be successful or fail. The
   command handler can pass back information to the machine thanks to the injected event emitter. 
- The raw event source is created with the subject factory passed as parameters. That subject must 
implement the `Observer` interface (in particular have the `next, complete, error` properties 
defined, with all of them being **synchronous** functions) and the `Observable` interface 
(`subscribe` property)
- The event source is terminated when the factory-created component is removed from the screen 

# Tips and gotchas
- most of the time `preprocessor` will just change the name of the event. You can 
perfectly if that makes sense, use `preprocessor : x => x` and directly pass on the raw 
events to the machine as input. That is fine 
  - as long as the machine never has to perform an effect (this is one of the machine's contract)
  . In our example, you will notice that we are doing `e.preventDefault()` in the preprocessor. 
  Furthermore, for documentation and design purposes, it makes sense to use any input 
  nomenclature which links to the domain rather than the user interface. As we have seen, what is
   a **button click** on the interface is a **search input** for the machine, and results in a 
   **search command** to the command handler. 
  - if the machine at hand is only designed for that user interface and not intended to be reused
 in any other context. This approach as a matter of fact couple the view to the machine. In the 
 case of our image gallery component, we could imagine a reusable parameterizable machine which 
 implements the behaviour of a generic search input. Having a preprocessor enables to integrate 
 such machines without a hiccup.
- some machine inputs may correspond to the aggregation of several events (in advanced usage). For 
instance, if we had to recreate a double click for the `Search` button, we would have to receive 
two clicks before passing a `SEARCH` input to the machine. Having an `eventHandler` interface 
allows to use `Rxjs` to deal with those cases, as its combinator library (`map`, `filter`, 
`takeUntil` etc.) allow to aggregate events in a fairly simple manner. Note that we could 
implement this logic in the state machine itself (our machines are essentially Turing machines, they can implement any effect-less computation), but: 
  1. it may be better to keep the machine dealing with inputs at a consistent level of 
  abstraction; 2. that kind of event aggregation is done easily enough with a dedicated 
  library such as `rxjs`
- you may want to handle some concurrency issues at the machine level. Typically in our 
example, that would mean handling the user scenario when the user is requesting two 
different queries in rapid succession and the first query response has not arrived before the 
second query is executed. There is in this case a risk of the user interface displaying the wrong
 response.
- you may also want to do it at the command handler level to keep your machine at a higher level 
of abstraction. A command handler may for instance recreate Rxjs's `switchMap` by keeping a record
 of in-flight queries.
- the interfaced systems can communicate with the machine via an event emitter. The 
`renderWith` Vue component is injected a `next` *prop* which is an event emitter which 
relays events to the machine's raw event source. Associated with DOM event handlers, this allows 
the machine to receive DOM events. Command handlers are also passed the `next` event emitter, and
 can use it to send to the machine any messages from the interfaced systems. 
- in those cases where the machine needs to communicate with other local but out of scope entities,
 it can emit its own events, for instance custom DOM events

# Prior art and useful references
- [User interfaces as reactive systems](https://brucou.github.io/posts/user-interfaces-as-reactive-systems/)
