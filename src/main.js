import { NO_OUTPUT } from "state-transducer"
export const COMMAND_RENDER = 'COMMAND_RENDER';

/**
 *
 * @param {String} name name of the Vue component to create
 * @param Vue Vue import
 * @param renderComponent Vue component which will be use by the rendering command handler
 * @param {Array<String>} props array of property names for the renderComponent
 * @param fsm
 * @param commandHandlers
 * @param effectHandlers
 * @param {function (): {subscribe, next, complete}} subjectFactory
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @returns {CombinedVueInstance<V extends Vue, Object, Object, Object, Record<never, any>>}
 */
export function makeVueStateMachine({name, renderComponent, props, fsm, commandHandlers, effectHandlers, subjectFactory,
                               options, Vue}) {
  const eventSubject = subjectFactory();
  const outputSubject = subjectFactory();

  const vueRenderCommandHandler = {
    [COMMAND_RENDER]: (next, params, effectHandlers, app) => {
      const props = Object.assign({}, params, { next, hasStarted : true });

      app.set(props);
    }
  };
  const commandHandlersWithRender = Object.assign({}, commandHandlers, vueRenderCommandHandler);

  const initPropsObj = props.reduce((acc, key) => (acc[key]=void 0, acc), {});
  const initialData = Object.assign({}, initPropsObj, {
    hasStarted: false,
    next: eventSubject.next,
    eventSubject,
    outputSubject,
    options : Object.assign({}, options),
    NO_ACTION: options.NO_ACTION || NO_OUTPUT
  });

  function render(h){
    const app = this;

    return app.hasStarted
      ? h(renderComponent, {
      // copy the props from the machine vue component to the render component
      props : props.reduce((acc, key) => (acc[key]=app[key], acc),{})
    }, [])
      : h('div', {}, '')
  }

  return Vue.component(name, {
    render,
    props : props,
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
            this.eventSubject.next,
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
