// Commands
/**
 * @typedef {NO_OUTPUT} NoCommand
 */
/**
 * @typedef {String} CommandName
 */
/**
 * @typedef {RenderCommand | SystemCommand} Command
 */
/**
 * @typedef {{command : COMMAND_RENDER, params : *  }} RenderCommand
 */
/**
 * @typedef {{command : CommandName, params : * }} SystemCommand
 */

// Mediator
/**
 * @typedef {Object} MachineProps
 * @property {EventPreprocessor} [preprocessor = x=>x]
 * @property {FSM_Def} fsm machine definition (typically events, states and transitions)
 * @property {Object.<CommandName, CommandHandler>} commandHandlers
 * @property {EventHandler} eventHandler Interface for event processing.
 * @property {Options} options Interface for event processing.
 */
/**
 * @typedef {function (RawEventSource) : MachineEventSource} EventPreprocessor
 */
/**
 * @typedef {Object} EventHandler
 * @property {function(): Subject} subjectFactory Returns a subject which implements the observer (`next`, `error`,
 * `complete`) and observable (`subscribe`) interface.
 */
/**
 * @typedef {Observable} MachineEventSource
 */
/**
 * @typedef {Subject} RawEventSource
 */
/**
 * @typedef {function(Emitter, Params, EffectHandlers): *} CommandHandler A command handler receives parameters to
 * perform its command. EffectHandlers are injected for the command handler to delegate effect execution. An
 * `Emitter` is also available for sending events to the state machine's `RawEventSource`. An emitter correspond to
 * the `next` property of the `Observer` interface
 */
/**
 * @typedef {Object.<EffectName, EffectHandler>} EffectHandlers
 */
/**
 * @typedef {function} EffectHandler
 */
/**
 * @typedef {String} EffectName
 */

