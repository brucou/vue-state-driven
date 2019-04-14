import { NO_OUTPUT } from "state-transducer"

export const COMMAND_RENDER = 'COMMAND_RENDER';
const identity = x => x;

function defaultRenderHandler(component, params, next){
  const props = Object.assign({}, params, { next, hasStarted: true });

  component.set(props);
}

/**
 *
 * @param {Object} vueMachineDef
 * @property {String} name name of the Vue component to create
 * @property Vue injected Vue object
 * @property renderWith Vue component which will be use by the rendering command handler
 * @property {Array<String>} props array of property names for the renderWith
 * @property {function} fsm
 * @property {Object.<CommandName, CommandHandler>} commandHandlers
 * @property {Object.<EffectName, EffectHandler>} effectHandlers
 * @property {function (): Subject} subjectFactory
 * @property {{NO_ACTION, initialEvent, ...}} options
 * @returns {CombinedVueInstance<V extends Vue, Object, Object, Object, Record<never, any>>}
 */
export function makeVueStateMachine(vueMachineDef) {
  // This factory returns a Vue component which takes no prop. `renderWith` is used to render the user interface
  // To make that work with Vue, we put the props for `renderWith` in the `data` of the Vue component and we update
  // that `data` with the new props from the render command produced by the embedded state machine
  const { name, renderWith, fsm, commandHandlers, effectHandlers, eventHandler, preprocessor, options, Vue } = vueMachineDef;
  const {subjectFactory} = eventHandler;
  const initialEvent = options && options.initialEvent;
  const props = vueMachineDef.props.concat('next');
  const eventSubject = subjectFactory();
  const next = eventSubject.next.bind(eventSubject);

  const vueRenderCommandHandler = {
    [COMMAND_RENDER]: (next, params, effectHandlers, component) => {
      effectHandlers[COMMAND_RENDER](component, params, next);
    }
  };

  const commandHandlersWithRender = Object.assign({}, commandHandlers, vueRenderCommandHandler);

  const effectHandlersWithRender =
    effectHandlers && effectHandlers[COMMAND_RENDER]
      ? effectHandlers
      : Object.assign({ [COMMAND_RENDER]: defaultRenderHandler }, effectHandlers);

  // TODO : error flows, parameter checking and friendly error messages like react-state-driven
  // DOC : `next` is injected prop so cannot be used in other ways by the render component
  // DOC : props must be defined as usual in the props array property for the render component
  const initPropsObj = props.reduce((acc, key) => (acc[key] = void 0, acc), {});
  const currentPropsObj = Object.assign({}, initPropsObj);
  const initialData = Object.assign({}, initPropsObj, {
    hasStarted: false,
    next,
    options: Object.assign({}, options),
    NO_ACTION: options.NO_ACTION || NO_OUTPUT
  });

  function render(h) {
    const app = this;
    props.reduce((acc, key) => (acc[key] = app[key], acc), currentPropsObj);

    return app.hasStarted
      ? h(renderWith, {
        // copy the props from the machine vue component to the render component
        props: Object.assign({}, currentPropsObj)
      }, [])
      // NOTE: could also use a style and toggling visibility: but KISS
      : h('div', {}, '')
  }

  return Vue.component(name, {
    render,
    data: function () {
      return initialData
    },
    methods: {
      set: function (stateObj) {
        Object.keys(stateObj).forEach(key => (this[key] = stateObj[key]));
      },
    },
    mounted: function () {
      // Set up execution of commands
      const component = this;
      (preprocessor || identity)(eventSubject).subscribe({
        next: eventStruct => {
          const actions = fsm(eventStruct);

          if (actions === this.NO_ACTION) return;
          actions.forEach(action => {
            if (action === this.NO_ACTION) return;
            const { command, params } = action;
            commandHandlersWithRender[command](
              next,
              params,
              effectHandlersWithRender,
              component,
            );
          });
        }
      });

      initialEvent && eventSubject.next(initialEvent);
    },
  })
}
