import { NO_OUTPUT } from "state-transducer"
export const COMMAND_RENDER = 'COMMAND_RENDER';

/**
 *
 * @param Vue Vue import
 * @param renderComponent Vue component which will be use by the rendering command handler
 * @param {Array<String>} initProps array of propery names for the renderComponent
 * @param fsm
 * @param commandHandlers
 * @param effectHandlers
 * @param {function (): {subscribe, next, complete}} subjectFactory
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @param {{NO_ACTION, initialEvent, ...}} options
 * @returns {CombinedVueInstance<V extends Vue, Object, Object, Object, Record<never, any>>}
 */
export function makeVueStateMachine({renderComponent, initProps, fsm, commandHandlers, effectHandlers, subjectFactory,
                               options, Vue}) {
  const propsViewComponentTemplate = initProps.map(key => `v-bind:${key}="${key}"`).join(" ");
  const initPropsObj = initProps.reduce((acc, key) => (acc[key]=void 0, acc), {});
  const vueRenderCommandHandler = {
    [COMMAND_RENDER]: (next, params, effectHandlers, app) => {
      const props = Object.assign({}, params, { next, hasStarted : true });

      app.set(props);
    }
  };
  const commandHandlersWithRender = Object.assign({}, commandHandlers, vueRenderCommandHandler);
  const template = ['<View v-if="hasStarted"', propsViewComponentTemplate, '></View>'].join(' ');

  console.debug('template', template);

  const eventSubject = subjectFactory();
  const outputSubject = subjectFactory();

  return new Vue({
    template,
    data: function () {
      return Object.assign({}, initPropsObj, {
        hasStarted: false,
        next: eventSubject.next,
        eventSubject,
        outputSubject,
        options : Object.assign({}, options),
        NO_ACTION: options.NO_ACTION || NO_OUTPUT
      })
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
    components: {
      View: renderComponent
    }
  })
}
