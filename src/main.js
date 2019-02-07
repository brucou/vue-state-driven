import { NO_OUTPUT } from "state-transducer"
export const COMMAND_RENDER = 'COMMAND_RENDER';

/**
 *
 * @param {String} name name of the Vue component to create
 * @param Vue Vue import
 * @param renderWith Vue component which will be use by the rendering command handler
 * @param {Array<String>} props array of property names for the renderWith
 * @param fsm
 * @param commandHandlers
 * @param effectHandlers
 * @param {function (): {subscribe, next, complete}} subjectFactory
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @returns {CombinedVueInstance<V extends Vue, Object, Object, Object, Record<never, any>>}
 */
export function makeVueStateMachine({name, renderWith, props:_props, fsm, commandHandlers, effectHandlers, subjectFactory,
                                      options, Vue}) {
  const props = _props.concat('next');
  const eventSubject = subjectFactory();
  const outputSubject = subjectFactory();
  const next = eventSubject.next.bind(eventSubject);

  const vueRenderCommandHandler = {
    [COMMAND_RENDER]: (next, params, effectHandlers, app) => {
      const props = Object.assign({}, params, { next, hasStarted : true });

      app.set(props);
      debugger
    }
  };
  const commandHandlersWithRender = Object.assign({}, commandHandlers, vueRenderCommandHandler);

  // DOC : `next` is reserved and cannot be used as a property for the render component
  const initPropsObj = props.reduce((acc, key) => (acc[key]=void 0, acc), {});
  const currentPropsObj = Object.assign({}, initPropsObj);
  const initialData = Object.assign({}, initPropsObj, {
    hasStarted: false,
    next,
    eventSubject,
    outputSubject,
    options : Object.assign({}, options),
    NO_ACTION: options.NO_ACTION || NO_OUTPUT
  });

  function render(h){
    const app = this;
    props.reduce((acc, key) => (acc[key]=app[key], acc),currentPropsObj);
    console.log('child props', currentPropsObj)

    return app.hasStarted
      ? h(renderWith, {
        // copy the props from the machine vue component to the render component
        props : Object.assign({}, currentPropsObj)
      }, [])
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
      const app = this;
      eventSubject.subscribe(eventStruct => {
        const actions = fsm(eventStruct);

        if (actions === this.NO_ACTION) return;
        actions.forEach(action => {
          if (action ===this.NO_ACTION) return;
          const { command, params } = action;
          commandHandlersWithRender[command](
            next,
            params,
            effectHandlers,
            app,
            this.outputSubject
          );
        });
      });

      this.options.initialEvent && this.eventSubject.next(this.options.initialEvent);
    },
  })
}
