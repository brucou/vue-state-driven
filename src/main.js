import { NO_OUTPUT } from "state-transducer"

export const COMMAND_RENDER = 'COMMAND_RENDER';

/**
 *
 * @param {String} name name of the Vue component to create
 * @param Vue injected Vue object
 * @param renderWith Vue component which will be use by the rendering command handler
 * @param {Array<String>} props array of property names for the renderWith
 * @param {function} fsm
 * @param {Object.<CommandName, CommandHandler>} commandHandlers
 * @param {Object.<EffectName, EffectHandler>} effectHandlers
 * @param {function (): Subject} subjectFactory
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @returns {CombinedVueInstance<V extends Vue, Object, Object, Object, Record<never, any>>}
 */
export function makeVueStateMachine({
                                      name, renderWith, props: _props, fsm, commandHandlers, effectHandlers, subjectFactory,
                                      options, Vue
                                    }) {
  // This factory returns a Vue component which takes no prop. `renderWith` is used to render the user interface
  // To make that work with Vue, we put the props for `renderWith` in the `data` of the Vue component and we update
  // that `data` with the new props from the render command produced by the embedded state machine
  const props = _props.concat('next');
  const eventSubject = subjectFactory();
  const outputSubject = subjectFactory();
  const next = eventSubject.next.bind(eventSubject);

  const vueRenderCommandHandler = {
    [COMMAND_RENDER]: (next, params, effectHandlers, component, outputSubject) => {
      const props = Object.assign({}, params, { next, hasStarted: true });

      component.set(props);
    }
  };
  const commandHandlersWithRender = Object.assign({}, commandHandlers, vueRenderCommandHandler);

  // DOC : `next` is injected prop so cannot be used in other ways by the render component
  // DOC : props must be defined as usual in the props array property for the render component
  const initPropsObj = props.reduce((acc, key) => (acc[key] = void 0, acc), {});
  const currentPropsObj = Object.assign({}, initPropsObj);
  const initialData = Object.assign({}, initPropsObj, {
    hasStarted: false,
    next,
    eventSubject,
    outputSubject,
    options: Object.assign({}, options),
    NO_ACTION: options.NO_ACTION || NO_OUTPUT
  });

  function render(h) {
    const app = this;
    props.reduce((acc, key) => (acc[key] = app[key], acc), currentPropsObj);
    console.log('child props', currentPropsObj)

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
      eventSubject.subscribe({
        next: eventStruct => {
          const actions = fsm(eventStruct);

          if (actions === this.NO_ACTION) return;
          actions.forEach(action => {
            if (action === this.NO_ACTION) return;
            const { command, params } = action;
            commandHandlersWithRender[command](
              next,
              params,
              effectHandlers,
              component,
              this.outputSubject
            );
          });
        }
      });

      this.options.initialEvent && this.eventSubject.next(this.options.initialEvent);
    },
  })
}
