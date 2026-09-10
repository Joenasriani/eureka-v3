export const GENERATORS = [
  ['G1','Remote Association',['novelty','remote']],
  ['G2','Bisociation',['collision','transfer']],
  ['G3','Structure First Analogy',['mapping','structure']],
  ['G4','Spontaneous Analogy',['association']],
  ['G5','Representational Change',['reframe','old_frame']],
  ['G6','Impasse Restructuring',['stuckness','constraint']],
  ['G7','Conceptual Blending',['combine']],
  ['G8','Contradiction Eureka',['contradiction','different_outcome']],
  ['G9','Boundary Eureka',['boundary','counterexample']],
  ['G10','Principle Inversion',['opposite','inversion']],
  ['G11','Hidden Variable',['missing_variable','expectation_violation']],
  ['G12','Scale Shift',['scale','system']],
  ['G13','Temporal Shift',['time','delay','latency']],
  ['G14','Bottleneck Eureka',['bottleneck','throughput']],
  ['G15','Asymmetry Eureka',['optionality','downside','upside']],
  ['G16','Emergence Eureka',['coordination','emergence']],
  ['G17','Selection Effect',['selection','sampling']],
  ['G18','Information Eureka',['information','signal','feedback']]
].map(([id,name,triggers]) => ({id,name,triggers}));

export const MATRICES = [
  {
    id:'queueing', name:'Queueing and flow', pool:'P3', distance:0.66, abstraction:0.66,
    intents:['start','focus','finish','prioritize','understand'],
    relations:['variable_arrivals','work_in_progress','throughput','congestion','uncertain_duration','feedback'],
    keywords:['schedule','calendar','tasks','busy','backlog','overload','priority','queue','deadline'],
    core:'A changing workload behaves less like a fixed timetable and more like a queue whose arrivals, service times, and congestion change while work is happening.',
    collisions:['fixed timetable ↔ variable arrivals','many active items ↔ congestion','starting work ↔ finishing flow'],
    move:'Cap active work before adding another item, then choose the next item from the state that actually exists after completion.',
    boundary:'A fixed timetable can outperform flow control when durations, arrivals, and priorities are genuinely predictable.',
    counter:'The schedule may be fine if interruption, avoidance, or unclear priorities are the actual cause.'
  },
  {
    id:'feedback_control', name:'Feedback control', pool:'P3', distance:0.74, abstraction:0.82,
    intents:['start','focus','finish','lead','understand','create'],
    relations:['feedback','state_change','open_loop','closed_loop','correction','latency'],
    keywords:['plan','adjust','feedback','review','progress','uncertain','changing','improvise'],
    core:'A fixed instruction is open loop. A feedback system observes the current state, compares it with a target, and adjusts the next action.',
    collisions:['preplanned sequence ↔ state dependent correction','delayed review ↔ continuous feedback','discipline ↔ observability'],
    move:'Shorten the interval between action and useful feedback before adding more planning detail.',
    boundary:'If the environment barely changes and the process is already well understood, feedback frequency may add overhead without value.',
    counter:'The failure may come from weak commitment rather than a mismatch between open loop planning and changing state.'
  },
  {
    id:'composition', name:'Composition by sketches', pool:'P2', distance:0.34, abstraction:0.28,
    intents:['start','create','finish','understand'],
    relations:['cheap_variation','deferred_evaluation','iteration','partial_artifact','feedback'],
    keywords:['music','compose','sketch','creative','design','draft','improvise','version'],
    core:'Creative work often starts with cheap partial forms. Selection and refinement happen after something exists to react to.',
    collisions:['judging before material exists ↔ judging after a sketch exists','perfect first attempt ↔ cheap variation','abstract intention ↔ partial artifact'],
    move:'Create a deliberately incomplete first artifact whose only job is to make the next judgment possible.',
    boundary:'Some tasks have safety, legal, or irreversible constraints that make cheap experimentation inappropriate.',
    counter:'The user may already sketch freely, in which case the bottleneck lies later in selection or completion.'
  },
  {
    id:'activation', name:'Threshold crossing', pool:'P3', distance:0.58, abstraction:0.53,
    intents:['start','focus','finish'],
    relations:['threshold','startup_cost','friction','momentum','minimum_action'],
    keywords:['start','procrastinate','avoid','begin','friction','overwhelmed','motivation'],
    core:'Some processes change behavior only after a threshold is crossed. The difficulty can be concentrated at entry rather than spread evenly across the whole task.',
    collisions:['task difficulty ↔ entry difficulty','motivation ↔ startup friction','whole project ↔ first irreversible feeling'],
    move:'Reduce the entry condition until beginning produces information or momentum without requiring commitment to the whole task.',
    boundary:'Lowering the starting threshold will not solve a task that is misaligned, unsafe, or genuinely impossible under current constraints.',
    counter:'The user may start easily and fail later, which would make threshold crossing the wrong representation.'
  },
  {
    id:'search', name:'Exploration and exploitation', pool:'P3', distance:0.73, abstraction:0.76,
    intents:['decide','create','learn','understand','prioritize'],
    relations:['exploration','exploitation','uncertainty','sampling','local_optimum','information_value'],
    keywords:['choose','idea','best','option','experiment','explore','decide','uncertain','research'],
    core:'When the quality of options is uncertain, choosing and learning are coupled. Exploiting the current favorite too early can prevent discovery of better options.',
    collisions:['choose best now ↔ learn enough to know what best means','commitment ↔ sampling','output ↔ information'],
    move:'Buy one cheap piece of discriminating information before making the expensive commitment.',
    boundary:'Exploration loses value when the decision window is closing or one option is already clearly dominant.',
    counter:'More exploration can be avoidance if the user already has enough information to decide.'
  },
  {
    id:'trailer', name:'Trailer logic', pool:'P2', distance:0.46, abstraction:0.31,
    intents:['influence','sell','teach','lead'],
    relations:['attention','sequence','information_gap','curiosity','next_action','reveal'],
    keywords:['film','movie','trailer','presentation','pitch','attention','explain','persuade','audience'],
    core:'A trailer does not deliver the whole work. It sequences enough information to make the next voluntary action attractive.',
    collisions:['complete explanation ↔ earned next step','more information ↔ information gap','persuasion ↔ voluntary continuation'],
    move:'Design the first message only to earn the next question or next twenty seconds, then place detail after that signal of interest.',
    boundary:'With informed consent, safety instructions, contracts, or consequential disclosures, withholding material information is not an acceptable attention tactic.',
    counter:'The audience may already be curious and instead need precision, proof, or direct comparison.'
  },
  {
    id:'compression', name:'Information compression', pool:'P3', distance:0.69, abstraction:0.71,
    intents:['influence','sell','teach','learn','understand'],
    relations:['compression','signal','noise','representation','salience','retrieval'],
    keywords:['explain','complex','message','attention','remember','teach','content','pitch','simple'],
    core:'A useful representation can preserve decision relevant structure while discarding detail that does not change the next inference.',
    collisions:['more detail ↔ more understanding','complete description ↔ usable representation','volume ↔ signal'],
    move:'Remove every detail that does not alter the audience\'s next inference, then test whether the remaining structure is enough.',
    boundary:'Compression becomes distortion when removed details would change consent, risk, comparison, or the decision itself.',
    counter:'The real issue may be missing evidence rather than excess information.'
  },
  {
    id:'network_diffusion', name:'Network diffusion', pool:'P3', distance:0.77, abstraction:0.78,
    intents:['influence','sell','lead','understand'],
    relations:['transmission','nodes','centrality','contagion','threshold','network_position'],
    keywords:['audience','share','viral','influence','community','network','followers','distribution','word of mouth'],
    core:'Reach and spread are different variables. A message can reach many nodes yet reproduce poorly if recipients have little reason or ability to pass it onward.',
    collisions:['audience size ↔ propagation','persuade everyone ↔ activate transmitters','exposure ↔ reproduction'],
    move:'Ask what would make one recipient voluntarily carry the message to a specific next person, then design for that handoff.',
    boundary:'Human communication is not literal disease transmission, and network metaphors can hide agency, context, and meaning.',
    counter:'The bottleneck may simply be insufficient initial reach rather than low transmission.'
  },
  {
    id:'bottleneck_shift', name:'Bottleneck relocation', pool:'P3', distance:0.63, abstraction:0.64,
    intents:['finish','lead','understand','create','prioritize'],
    relations:['bottleneck','throughput','constraint','handoff','verification','relocation'],
    keywords:['automation','ai','review','approval','slow','bottleneck','waiting','team','process','workflow'],
    core:'Improving one stage can expose another stage as the new binding constraint. The system becomes faster locally while total throughput barely changes.',
    collisions:['local speed ↔ system throughput','automation ↔ verification load','more capacity ↔ shifted constraint'],
    move:'Measure where work waits after the improvement, then optimize the new constraint instead of the stage already accelerated.',
    boundary:'A slower downstream stage is not automatically the binding constraint if demand or upstream quality is the real limiter.',
    counter:'The improvement may genuinely increase total throughput and the perceived bottleneck may be temporary.'
  },
  {
    id:'portfolio', name:'Concentration and replacement latency', pool:'P3', distance:0.68, abstraction:0.66,
    intents:['decide','understand','prioritize'],
    relations:['concentration','dependency','replacement_latency','failure_cost','diversification','efficiency'],
    keywords:['client','revenue','supplier','platform','dependency','risk','income','customer','channel'],
    core:'Concentration can increase efficiency while also increasing exposure. The practical risk depends partly on how quickly a lost dependency can be replaced and how damaging the gap would be.',
    collisions:['concentration ↔ efficiency','single dependency ↔ replacement time','diversify count ↔ resilience'],
    move:'Estimate replacement latency and failure cost before treating diversification itself as the only remedy.',
    boundary:'This is a structural risk representation, not individualized financial advice or a probability estimate.',
    counter:'A concentrated relationship can be rational when switching costs are low, contracts are strong, or alternatives are immediately available.'
  },
  {
    id:'option_value', name:'Option value', pool:'P3', distance:0.72, abstraction:0.75,
    intents:['decide','negotiate','create','prioritize'],
    relations:['optionality','reversibility','uncertainty','commitment','downside','future_choices'],
    keywords:['commit','decision','contract','choice','irreversible','risk','negotiate','option'],
    core:'Under uncertainty, an option can be valuable because it preserves the ability to learn before committing more resources.',
    collisions:['best expected outcome ↔ value of reversibility','commit now ↔ preserve future choice','certainty ↔ information arrival'],
    move:'Prefer the next step that reveals useful information while preserving the ability to change direction, unless delay itself is costly.',
    boundary:'Optionality is not free. Delay, opportunity cost, and expiring opportunities can make commitment superior.',
    counter:'The user may be overvaluing reversibility and using optionality to avoid a necessary commitment.'
  },
  {
    id:'signaling', name:'Signals and interpretation', pool:'P3', distance:0.7, abstraction:0.73,
    intents:['influence','sell','lead','understand'],
    relations:['signal','receiver','credibility','cost','identity','interpretation'],
    keywords:['brand','trust','credibility','price','status','message','signal','reputation','feature'],
    core:'People infer hidden qualities from observable signals. What an action communicates can differ from what the sender intended it to communicate.',
    collisions:['feature utility ↔ inferred meaning','intention ↔ receiver inference','claim ↔ credible signal'],
    move:'List what the audience can actually observe and ask what each observable would rationally imply from their position.',
    boundary:'Signal interpretations vary by culture, context, incentives, and prior beliefs. Do not assume one universal reading.',
    counter:'The audience may already trust the sender and simply need concrete evidence of utility.'
  },
  {
    id:'protocol', name:'Protocol design', pool:'P3', distance:0.71, abstraction:0.76,
    intents:['lead','influence','finish','understand'],
    relations:['coordination','rules','handoff','state','roles','failure_modes'],
    keywords:['team','meeting','handoff','communication','coordination','approval','roles','process'],
    core:'Coordination failures can come from interaction rules rather than from the quality or intent of individual participants.',
    collisions:['better people ↔ better protocol','communication quantity ↔ state clarity','goodwill ↔ handoff rules'],
    move:'Specify who owns the next state transition, what information must travel with it, and what counts as complete.',
    boundary:'A protocol cannot compensate for deliberate noncooperation, missing capability, or goals that genuinely conflict.',
    counter:'The process may already be clear and the real issue may be incentives or workload.'
  },
  {
    id:'selection', name:'Selection effects', pool:'P3', distance:0.79, abstraction:0.8,
    intents:['understand','decide','learn'],
    relations:['selection','observed_sample','missing_cases','survivorship','measurement','inference'],
    keywords:['successful','examples','customers','feedback','reviews','data','sample','only','survivor'],
    core:'What is observed can be shaped by the process that decides which cases become visible. Missing cases can change the apparent pattern.',
    collisions:['observed pattern ↔ selection mechanism','visible success ↔ invisible failures','feedback ↔ who remained to give feedback'],
    move:'Identify who or what had to survive, respond, remain, or be measured before entering the evidence you are using.',
    boundary:'A selection effect is a hypothesis to test, not a default reason to dismiss observed data.',
    counter:'The sample may already be representative enough for the decision at hand.'
  },
  {
    id:'path_dependence', name:'Path dependence', pool:'P3', distance:0.76, abstraction:0.77,
    intents:['decide','understand','create'],
    relations:['history','lock_in','switching_cost','sequence','irreversibility','future_constraints'],
    keywords:['habit','legacy','system','old','switch','locked','history','process','career'],
    core:'The current state can depend on the sequence of earlier choices, not only on what would be optimal if starting fresh today.',
    collisions:['best now ↔ inherited path','current preference ↔ switching cost','choice ↔ future constraint'],
    move:'Separate what you would choose from scratch from what you retain only because previous choices made switching expensive.',
    boundary:'History matters only when prior choices actually change current costs, capabilities, information, or available options.',
    counter:'The present design may still be best even after switching costs are ignored.'
  },
  {
    id:'redundancy', name:'Redundancy and resilience', pool:'P3', distance:0.7, abstraction:0.69,
    intents:['decide','lead','understand'],
    relations:['redundancy','resilience','efficiency','failure','backup','correlated_risk'],
    keywords:['backup','risk','single','dependency','reliable','resilience','efficient','failure'],
    core:'Removing all duplication can improve local efficiency while making failure more expensive when the remaining path breaks.',
    collisions:['efficiency ↔ resilience','unused capacity ↔ insurance','duplication ↔ failure containment'],
    move:'Identify one failure whose consequence is disproportionate, then decide whether a deliberately unused backup is worth maintaining.',
    boundary:'Redundancy has carrying costs and can create complexity. Not every component deserves a backup.',
    counter:'The system may have adequate substitutes already, making extra redundancy wasteful.'
  },
  {
    id:'error_correction', name:'Error correction', pool:'P3', distance:0.73, abstraction:0.74,
    intents:['learn','teach','lead','create'],
    relations:['error','feedback','redundancy','detection','correction','signal'],
    keywords:['mistake','quality','review','learn','feedback','error','accuracy','practice'],
    core:'Reliable systems are often designed to detect and correct error rather than assuming error can be prevented completely.',
    collisions:['avoid mistakes ↔ detect mistakes quickly','perfect execution ↔ recoverable error','review ↔ correction channel'],
    move:'Design one fast signal that reveals the most costly class of mistake early enough to correct it.',
    boundary:'Some failures are irreversible or too dangerous to rely on correction after the fact.',
    counter:'The dominant problem may be insufficient skill rather than missing error detection.'
  },
  {
    id:'niche', name:'Niche fit', pool:'P3', distance:0.78, abstraction:0.73,
    intents:['sell','create','understand','decide'],
    relations:['fit','environment','competition','specialization','resource','position'],
    keywords:['market','competition','positioning','audience','career','fit','differentiate','niche'],
    core:'Performance depends partly on fit between capabilities and environment. A weak position in one environment can become strong when the relevant constraints change.',
    collisions:['absolute quality ↔ contextual fit','compete harder ↔ change environment','general strength ↔ specialized advantage'],
    move:'Name the condition under which your unusual capability becomes unusually valuable, then search for environments where that condition already exists.',
    boundary:'Changing category or niche cannot rescue an offer that lacks basic utility or credible demand.',
    counter:'The current environment may be correct and the real issue may be execution quality.'
  }
];

export const CONTRASTS = [
  {
    id:'fixed_plan_valid', name:'When fixed plans work', relations:['predictable_duration','stable_priorities','low_interruptions'],
    text:'Fixed schedules become more useful when tasks have predictable duration, few arrivals appear during execution, and priority changes are rare.'
  },
  {
    id:'full_explanation_valid', name:'When completeness comes first', relations:['material_disclosure','high_stakes','consent','precision'],
    text:'Complete information can be necessary before action when omissions would change consent, risk, legal meaning, or safety.'
  },
  {
    id:'commitment_valid', name:'When commitment beats optionality', relations:['deadline','decay','coordination','switching_cost'],
    text:'Preserving options can become costly when delay destroys opportunity, coordination requires commitment, or switching itself is the main source of waste.'
  },
  {
    id:'specialization_valid', name:'When concentration is efficient', relations:['specialization','stable_dependency','low_replacement_cost'],
    text:'Concentration can be rational when the dependency is stable, replacement is quick, and specialization creates material efficiency.'
  }
];
