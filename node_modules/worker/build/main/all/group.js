const {
	HP_WORKER_NOTIFICATION,
	DC_CHANNEL,
} = require('./locals.js');

const manifest = require('./manifest.js');


const XM_STRATEGY_EQUAL = 1 << 0;

const XM_STRATEGY_ORDERED_GROUPS_BALANCED = 1 << 2;
const XM_STRATEGY_ORDERED_GROUPS_BIASED = 1 << 3;

const XM_STRATEGY_ORDERED_GROUPS = XM_STRATEGY_ORDERED_GROUPS_BALANCED | XM_STRATEGY_ORDERED_GROUPS_BIASED;

const XM_DISTRIBUTION_CONSTANT = 1 << 0;


class armed_group {
	constructor(k_group, a_subsets) {
		Object.assign(this, {
			group: k_group,
			subsets: a_subsets,
		});
	}

	map(s_task, z_args=[], h_events_map={}, s_debug=null) {
		let {
			group: k_group,
			subsets: a_subsets,
		} = this;

		// how many subsets to process
		let nl_subsets = a_subsets.length;

		// prepare to deal with results
		let k_action = new active_group(k_group, nl_subsets);

		// create manifest object
		let k_manifest = manifest.from(z_args);

		// no subsets
		if(!nl_subsets) {
			setTimeout(() => {
				// result handler was not used; auto-end it
				if(!k_action.piped) k_action.end();

				// force end stream
				k_action.force_end();
			}, 0);
		}
		// yes subsets
		else {
			// summon workers as they become available
			k_group.summon_workers(nl_subsets, (k_worker, i_subset) => {
				// if(h_dispatch.debug) debugger;

				// result handler was not used; auto-end it
				if(!k_action.piped) k_action.end();

				// make result handler
				let fk_result = k_action.mk_result(k_worker, i_subset);

				// make worker-specific events
				let h_events_worker = this.event_router(h_events_map, i_subset);

				// push subset to front of args
				let k_manifest_worker = k_manifest.prepend(a_subsets[i_subset]);

				// execute worker on next part of data
				k_worker.exec({
					task: s_task,
					manifest: k_manifest_worker,
					hold: k_action.upstream_hold,
					events: h_events_worker,
				}, fk_result);
			});
		}

		// let user bind a handler
		return k_action;
	}

	event_router(h_events, i_subset) {
		if(!h_events) return null;

		// make a new hash that pushes worker index in front of callback args
		let h_events_local = {};
		for(let s_event in h_events) {
			let f_event = h_events[s_event];
			h_events_local[s_event] = (...a_args) => {
				f_event(i_subset, ...a_args);
			};
		}

		return h_events_local;
	}
}


class active_group {
	constructor(k_group, n_tasks, f_push=null) {
		Object.assign(this, {
			group: k_group,
			task_count: n_tasks,

			// whether or not the user has routed this stream yet
			piped: false,

			// link to next action downstream
			downstream: null,

			// whether or not the action upstream should hold data in worker
			upstream_hold: false,

			result_count: 0,

			result_callback: null,
			complete_callback: null,

			push: f_push || (() => {
				throw new Error(`cannot '.push()' here`);
			}),
			carry: null,

			reductions: null,
			reduce_task: null,

			results: null,
			sequence_index: 0,
		});
	}

	thru(s_task, z_args=[], h_events=null) {
		Object.assign(this, {
			piped: true,
			route: this.route_thru,
			upstream_hold: true,
			next_task: {
				task: s_task,
				manifest: manifest.from(z_args),
				events: h_events,
			},
		});

		return this.completable();
	}

	each(fk_result, fk_complete=null) {
		Object.assign(this, {
			piped: true,
			route: this.route_each,
			result_callback: fk_result,
			complete_callback: fk_complete,
		});

		return this.completable();
	}

	series(fk_result, fk_complete=null) {
		Object.assign(this, {
			piped: true,
			route: this.route_series,
			result_callback: fk_result,
			complete_callback: fk_complete,
			results: new Array(this.task_count),
		});

		return this.completable();
	}

	reduce(z_task, z_args=[], h_events=null, s_debug=null) {
		let h_reduce_task = {};
		if('string' === typeof z_task) {
			h_reduce_task.task = z_task;
		}
		else if('function' === typeof z_task) {
			h_reduce_task.function = z_task;
		}
		else {
			throw new TypeError(`invalid task arg: ${typeof z_task}`);
		}
		return new Promise((f_resolve) => {
			Object.assign(this, {
				debug: s_debug,
				piped: true,
				route: this.route_reduce,
				complete_callback: f_resolve,
				upstream_hold: this.task_count > 1,  // set `hold` flag for upstream sending its task
				reductions: new convergent_pairwise_tree(this.task_count),
				reduce_task: {
					...h_reduce_task,
					manifest: new manifest(z_args),
					events: h_events,
					hold: true,  // assume another reduction will be performed by default
				},
			});
		});
	}

	// results not handled
	route() {
		console.warn('result from worker was not handled! make sure to bind a handler before going async. use `.ignore()` if you do not care about the result');
	}

	route_thru(hp_notification, i_subset, k_worker, i_task) {
		// create specific task for worker to receive data from its previous task
		let h_task = Object.assign({
			receive: i_task,
			hold: this.downstream.upstream_hold,
		}, this.next_task);

		// assign worker new task
		this.group.assign_worker(k_worker, h_task, (...a_args) => {
			// mk result
			let f_result = this.downstream.mk_result(k_worker, i_subset);

			// trigger result
			f_result(...a_args);
		});
	}

	// return results immediately
	route_each(z_result, i_subset, k_worker, i_task) {
		this.handle_result_callback(z_result, i_subset, k_worker, i_task);

		// this was the last result
		if(++this.result_count === this.task_count && 'function' === typeof this.complete_callback) {
			this.complete_callback();
		}
	}

	route_series(z_result, i_subset, k_worker, i_task) {
		let {
			task_count: n_tasks,
			result_callback: fk_result,
			sequence_index: i_sequence,
			results: a_results,
		} = this;

		// result arrived while we were waiting for it
		if(i_subset === i_sequence) {
			// while there are results to process
			for(;;) {
				// process result
				this.handle_result_callback(z_result, i_sequence, k_worker, i_task);

				// reached end of sequence; that was last result
				if(++i_sequence === n_tasks) {
					// completion callback
					if('function' === typeof this.complete_callback) {
						this.complete_callback();
					}

					// exit loop and save sequence index
					break;
				}

				// next result not yet ready
				let h_next_result = a_results[i_sequence];
				if(!h_next_result) break;

				// else; onto next result
				z_result= h_next_result;

				// release to gc
				a_results[i_sequence] = null;
			}
		}
		// not yet ready to process this result
		else {
			// store it for now
			a_results[i_subset] = z_result;
		}

		// update sequence index
		this.sequence_index = i_sequence;
	}

	route_reduce(hp_notification, i_subset, k_worker, i_task) {
		// node initiation
		let h_canopy_node = this.reductions.ray(i_subset, {
			worker: k_worker,
			task_id: i_task,
		});

		// start at canopy node
		this.reduce_result(hp_notification, h_canopy_node);
	}

	// each time a worker completes
	reduce_result(z_result, h_node) {
		let {
			group: k_group,
			reductions: k_pairwise_tree,
			reduce_task: h_task_ready,
		} = this;

		// final result
		if(HP_WORKER_NOTIFICATION !== z_result) {
			let z_completion = this.complete_callback(z_result);

			// add to outer stream
			if(z_completion instanceof active_group) {
				let k_lake = this.lake();
				let fk_lake = k_lake.complete_callback;
				let hp_lock = Symbol('key');

				z_completion.end(() => {
					k_group.unlock(hp_lock);
				});

				// rewrap completion callback function
				k_lake.complete_callback = () => {
					k_group.wait(hp_lock, () => {
						fk_lake();
					});
				};
			}
		}
		// notification
		else {
			if(this.debug) {
				console.warn('\t == committed '+h_node.left+' </> '+h_node.right);
			}

			// able to perform a reduction
			let h_merge = k_pairwise_tree.commit(h_node);
			// k_pairwise_tree.print();
			if(h_merge) {
				if(this.debug) {
					console.warn('merged '+h_merge.node.left+' <-> '+h_merge.node.right);
				}
				let k_worker = h_node.item.worker;

				// this reduction will be the last one; do not hold result
				if(h_merge.makes_root) {
					h_task_ready = Object.assign({}, h_task_ready);
					h_task_ready.hold = false;
				}

				// after reduction;
				let fk_reduction = (z_result_reduction, i_task_reduction, k_worker_reduction) => {
					// if(this.debug) debugger;

					// recurse on reduction; update sender for callback scope
					this.reduce_result(z_result_reduction, Object.assign(h_merge.node, {
						item: {
							worker: k_worker_reduction,
							task_id: i_task_reduction,
						},
					}));
				};

				// give reduction task to worker that finished earlier; pass to the right
				if(k_worker === h_merge.left.worker) {
					k_group.relay({
						debug: this.debug,
						sender: h_node.item,
						receiver: h_merge.right,
						receiver_primary: false,
						task_ready: h_task_ready,
					}, fk_reduction);
				}
				// pass to the left
				else {
					k_group.relay({
						debug: this.debug,
						sender: h_node.item,
						receiver: h_merge.left,
						receiver_primary: true,
						task_ready: h_task_ready,
					}, fk_reduction);
				}
			}
		}
	}

	force_end() {
		if('function' === typeof this.complete_callback) {
			this.complete_callback();
		}

		if(this.downstream) {
			this.downstream.force_end();
		}
	}

	route_end() {
		// this was the last result
		if(++this.result_count === this.task_count && 'function' === typeof this.complete_callback) {
			this.complete_callback();
		}
	}

	completable() {
		let fk_complete = this.complete_callback;

		// nothing to reduce; complete after establishing downstream
		if(!this.task_count && 'function' === typeof fk_complete) {
			setTimeout(fk_complete, 0);
		}

		return this.downstream = new active_group(this.group, this.task_count, this.push);
	}

	handle_result_callback(z_result, i_subset, k_worker, i_task) {
		let k_downstream = this.downstream;

		// apply callback and capture return
		let z_return = this.result_callback(z_result, i_subset);

		// downstream is expecting data for next task
		if(k_downstream && k_downstream.piped) {
			// nothing was returned; reuse input data
			if(undefined === z_return) {
				// downstream action was expecting worker to hold data
				if(k_downstream.upstream_hold) {
					throw 'not yet implemented';
				}
				else {
					k_downstream.route(z_result, i_subset, k_worker, i_task);
				}
			}
			// returned promise
			else if(z_return instanceof Promise) {
				z_return
					// await promise resolve
					.then((z_carry) => {
						k_downstream.route(z_carry, i_subset, k_worker, i_task);
					})
					// catch promise reject
					.catch((e_reject) => {
						throw new Error('uncaught rejection');
					});
			}
			// returned error
			else if(z_return instanceof Error) {
				throw new Error('not yet implemented');
			}
			// returned immediately
			else {
				k_downstream.route(z_return, i_subset, k_worker, i_task);
			}
		}
		// something was returned though
		else if(undefined !== z_return) {
			console.warn('a task stream handler return some value but it cannot be carried because downstream is not expecting task data');
			debugger;
		}
	}

	end(fk_complete=null) {
		// new promise
		return new Promise((fk_end) => {
			Object.assign(this, {
				piped: true,
				route: this.route_end,
				complete_callback: async () => {
					// await complete callback
					if(fk_complete) await fk_complete();

					// now resolve
					fk_end();
				},
			});
		});
	}


	mk_result(k_worker, i_subset) {
		// for when a result arrives
		return (z_result, i_task) => {
			// this worker just made itself available
			this.group.worker_available(k_worker);

			// route the result
			this.route(z_result, i_subset, k_worker, i_task);
		};
	}

	// traverse all the way downstream
	lake() {
		let k_downstream = this;
		for(;;) {
			if(k_downstream.downstream) k_downstream = k_downstream.downstream;
			else break;
		}
		return k_downstream;
	}
}


function divide(a_things, n_workers, xm_strategy, h_divide={}) {
	let nl_things = a_things.length;

	let {
		item_count: c_items_remain=nl_things,
		open: f_open=null,
		seal: f_seal=null,
		quantify: f_quantify=() => {
			throw new Error(`must provide function for key 'quantify' when using '.balance_ordered_groups()'`);
		},
	} = h_divide;

	let a_tasks = [];

	if(Array.isArray(a_things)) {
		// do not assign workers to nothing
		if(nl_things < n_workers) n_workers = nl_things;

		// items per worker
		let x_items_per_worker = Math.floor(c_items_remain / n_workers);

		// distribute items equally
		if(XM_STRATEGY_EQUAL === xm_strategy) {
			// start index of slice
			let i_start = 0;

			// each worker
			for(let i_worker=0; i_worker<n_workers; i_worker++) {
				// find end index of worker; ensure all items find a worker
				let i_end = (i_worker===n_workers-1)? nl_things: i_start+x_items_per_worker;

				// extract slice from things and push to divisions
				a_tasks.push(a_things.slice(i_start, i_end));

				// advance index for next division
				i_start = i_end;

				// update number of items remaining
				c_items_remain -= x_items_per_worker;

				// recalculate target items per worker
				x_items_per_worker = Math.floor(c_items_remain / (n_workers - i_worker - 1));
			}
		}
		// ordered groups
		else if(XM_STRATEGY_ORDERED_GROUPS & xm_strategy) {
			let i_worker = 0;
			let c_worker_items = 0;

			// open new task item list
			let a_task_items = [];
			let z_task_data = f_open? f_open(a_task_items): a_task_items;

			// each group
			for(let i_group=0; i_group<nl_things; i_group++) {
				let h_group = a_things[i_group];
				let n_group_items = f_quantify(h_group);

				// adding this to current worker would exceed target load (make sure this isn't final worker)
				let n_worker_items_preview = n_group_items + c_worker_items;
				if((n_worker_items_preview > x_items_per_worker) && i_worker < n_workers-1) {
					let b_advance_group = false;

					// balance mode
					if(XM_STRATEGY_ORDERED_GROUPS_BALANCED === xm_strategy) {
						// preview is closer to target; add task item to worker before advancing
						if((n_worker_items_preview - x_items_per_worker) < (x_items_per_worker - c_worker_items)) {
							a_task_items.push(h_group);
							c_worker_items = n_worker_items_preview;

							// advance group after new task
							b_advance_group = true;
						}
					}

					// add task item to output (transforming it when appropriate)
					a_tasks.push(f_seal? f_seal(z_task_data): z_task_data);

					// next task item list
					a_task_items = [];
					c_items_remain -= c_worker_items;
					x_items_per_worker = c_items_remain / (n_workers - (++i_worker));
					c_worker_items = 0;

					// task item open
					z_task_data = f_open? f_open(a_task_items): a_task_items;

					// advance group
					if(b_advance_group) continue;
				}

				// add task to list
				a_task_items.push(h_group);
				c_worker_items += n_group_items;
			}

			// add final task item
			a_tasks.push(f_seal? f_seal(z_task_data): z_task_data);
		}
		// unknown strategy
		else {
			throw new RangeError('no such strategy');
		}
	}
	// typed array
	else if('byteLength' in a_things) {
		// divide 
		throw 'not yet implemented';
	}
	// unsupported type
	else {
		throw new Error('worker can only divide data in arrays (either plain or typed)');
	}

	return a_tasks;
}


class convergent_pairwise_tree {
	constructor(n_items) {
		let a_canopy = [];
		for(let i_item=0; i_item<n_items; i_item++) {
			a_canopy.push({
				ready: false,
				up: null,
				item: null,
				left: i_item - 1,
				right: i_item + 1,
			});
		}

		Object.assign(this, {
			item_count: n_items,
			canopy: a_canopy,
			steps: 0,
		});
	}

	ray(i_item, z_item) {
		let h_node = this.canopy[i_item];
		h_node.item = z_item;
		return h_node;
	}

	top(h_top) {
		for(;;) {
			let h_up = h_top.up;
			if(h_up) h_top = h_up;
			else break;
		}
		return h_top;
	}

	merge(h_left, h_right) {
		let n_items = this.item_count;

		let h_node = {
			ready: false,
			up: null,
			item: null,
			left: h_left.left,
			right: h_right.right,
		};

		h_left.up = h_right.up = h_node;

		return {
			node: h_node,
			left: h_left.item,
			right: h_right.item,
			makes_root: -1 === h_left.left && n_items === h_right.right,
		};
	}

	print() {
		let a_lines = new Array(this.canopy.length);

		debugger;
		this.canopy.forEach((h_node, i_node) => {
			a_lines[i_node] = `[${i_node}] ${h_node.ready? '-'.repeat(h_node.steps)+'O': '-'.repeat(this.steps)}`;
		});
	}

	commit(h_node) {
		let n_items = this.item_count;
		let a_canopy = this.canopy;
		this.steps += 1;

		// left edge of list
		if(-1 === h_node.left) {
			// tree root was handed to commit
			if(h_node.right === n_items) {
				throw new Error('cannot commit root!');
			}

			// neighbor on right side
			let h_right = this.top(a_canopy[h_node.right]);

			// neighbor is ready!
			if(h_right.ready) {
				return this.merge(h_node, h_right);
			}
			// neighbor is busy/not ready; mark this item as ready
			else {
				h_node.ready = true;
				h_node.steps = this.steps;
			}
		}
		// right edge of list
		else if(n_items === h_node.right) {
			// neighbor on left side
			let h_left = this.top(a_canopy[h_node.left]);

			// neighbor is ready
			if(h_left.ready) {
				return this.merge(h_left, h_node);
			}
			// neighbor is busy/not ready; mark this item as ready
			else {
				h_node.ready = true;
				h_node.steps = this.steps;
			}
		}
		// somewhere in the middle
		else {
			// start with left neighbor
			let h_left = this.top(a_canopy[h_node.left]);

			// neighbor is ready
			if(h_left.ready) {
				return this.merge(h_left, h_node);
			}
			// neighbor is busy/not ready
			else {
				// try right neighbor
				let h_right = this.top(a_canopy[h_node.right]);

				// neighbor is ready
				if(h_right.ready) {
					return this.merge(h_node, h_right);
				}
				// neighbor is busy/not ready; mark this item as ready
				else {
					h_node.ready = true;
					h_node.steps = this.steps;
				}
			}
		}

		return null;
	}
}


module.exports = function(dc_worker) {
	const pool = require('./pool.js')(dc_worker);
	return class group extends pool {
		constructor(...a_args) {
			super(...a_args);

			let {
				limit: n_workers,
			} = this;

			// make workers
			let hm_roster = new WeakMap();
			for(let i_worker=0; i_worker<n_workers; i_worker++) {
				// spawn new worker
				let k_worker = this.spawn_worker();

				// reserve a queue for it in roster
				hm_roster.set(k_worker, []);
			}

			// save group fields
			Object.assign(this, {
				roster: hm_roster,
				locks: {},
				next_worker_summon: 0,
			});
		}

		data(a_items) {
			return new armed_group(this, this.balance(a_items));
		}

		use(a_subsets) {
			if(a_subsets.length > this.limit) {
				throw new RangeError(`too many subsets given for number of workers: ${a_subsets.length} subsets > ${this.limit} workers`);
			}

			return new armed_group(this, a_subsets);
		}

		run(...a_args) {
			let {
				workers: a_workers,
				limit: n_workers,
			} = this;

			let a_promises = [];
			for(let i_worker=0; i_worker<n_workers; i_worker++) {
				a_promises.push(new Promise((fk_worker, fe_worker) => {
					this.schedule(a_workers[i_worker], (k_worker) => {
						k_worker.run(...a_args)
							.then(() => {
								// worker made itself available
								this.worker_available(k_worker);

								// resolve promise
								fk_worker();
							})
							.catch(fe_worker);
					});
				}));
			}

			return a_promises;
		}

		balance(a_items) {
			return divide(a_items, this.limit, XM_STRATEGY_EQUAL);
		}

		balance_ordered_groups(a_groups, h_divide) {
			return divide(a_groups, this.limit, XM_STRATEGY_ORDERED_GROUPS_BALANCED, h_divide);
		}

		bias_ordered_groups(a_groups, h_divide) {
			return divide(a_groups, this.limit, XM_STRATEGY_ORDERED_GROUPS_BIASED, h_divide);
		}

		divisions(n_items) {
			let n_workers = this.limit;

			// do not assign worker to do nothing
			if(n_items < n_workers) n_workers = n_items;

			// how many times to divide the items
			let n_divisions = n_workers - 1;

			// ideal number of items per worker
			let x_items_per_worker = n_items / n_workers;

			// item indices where to make divisions
			let a_divisions = [];
			for(let i_division=1; i_division<=n_divisions; i_division++) {
				a_divisions.push(Math.round(i_division * x_items_per_worker));
			}

			return a_divisions;
		}

		*divider(c_items_remain, xm_distribution=XM_DISTRIBUTION_CONSTANT) {
			let c_workers_remain = this.limit;

			// items per worker
			let n_items_per_division = Math.floor(c_items_remain / c_workers_remain);

			// constant distribution
			if(XM_DISTRIBUTION_CONSTANT === xm_distribution) {
				let c_items = 0;

				// iteratively find indexes to divide at
				for(;;) {
					// divide here
					if(++c_items >= n_items_per_division) {
						// dividing now would cause item overflow
						if(!--c_workers_remain) {
							// don't create any more divisions
							for(;;) yield false;
						}

						// division okay
						yield true;

						// how many items remain
						c_items_remain -= c_items;

						// reset item count for new worker
						c_items = 0;

						// recalculate target items per worker
						n_items_per_division = Math.floor(c_items_remain / c_workers_remain);
					}
					// push item
					else {
						yield false;
					}
				}
			}
		}


		// latent(h_dispatch) {
		// 	let {
		// 		task: s_task,
		// 		args: a_args_dispatch=[],
		// 		task_count: n_tasks=this.limit,
		// 		events: h_events_dispatch,
		// 	} = h_dispatch;

		// 	let i_subset = 0;

		// 	// prepare to deal with results
		// 	let k_planner = new active_group(this, n_tasks, (a_args=[], a_transfer=null) => {
		// 		// summon workers one at a time
		// 		this.summon_workers(1, (k_worker) => {
		// 			// result handler was not used; auto-end it
		// 			if(!k_planner.used) k_planner.end();

		// 			// make result handler
		// 			let fk_result = k_planner.mk_result(k_worker, i_subset++);

		// 			// make worker-specific events
		// 			let h_events_worker = this.event_router(h_events_dispatch, i_subset);

		// 			// execute worker on this part of data
		// 			k_worker.exec({
		// 				task: s_task,
		// 				args: [...a_args_dispatch, ...a_args],
		// 				transfer: a_transfer,
		// 				hold: k_planner.upstream_hold,
		// 				events: h_events_worker,
		// 			}, fk_result);
		// 		});
		// 	});

		// 	// let user bind handler
		// 	return k_planner;
		// }

		schedule(k_worker, f_run) {
			// worker available immediately
			if(k_worker.available) {
				f_run(k_worker);
			}
			// push to priority queue
			else {
				this.roster.get(k_worker).push(f_run);
			}
		}

		assign_worker(k_worker, h_task, fk_task) {
			// once it is time to run the task on the given worker
			this.schedule(k_worker, () => {
				k_worker.exec(h_task, (...a_args) => {
					// worker just made itself available
					this.worker_available(k_worker);

					// callback
					fk_task(...a_args);
				});
			});
		}

		relay(h_relay, fk_result) {
			let {
				sender: {
					worker: k_worker_sender,
					task_id: i_task_sender,
				},
				receiver: {
					worker: k_worker_receiver,
					task_id: i_task_receiver,
				},
				receiver_primary: b_receiver_primary,
				task_ready: h_task_ready,
				debug: s_debug,
			} = h_relay;

			// let s_sender = 'S'+String.fromCharCode(65+k_worker_sender.id);
			// let s_receiver = 'S'+String.fromCharCode(65+k_worker_receiver.id);

			// create message channel
			let k_channel = DC_CHANNEL.between(k_worker_sender, k_worker_receiver);

			if(k_worker_sender === k_worker_receiver) debugger;

			// console.warn(`M/relay/receive [${i_task_sender}] => ${i_task_receiver}`);

			// attach debug tag to ready task
			if(s_debug) h_task_ready.debug = s_debug;

			// schedule receiver worker to receive data and then run task
			this.schedule(k_worker_receiver, () => {
				k_worker_receiver.receive(k_channel.port_1(), {
					import: i_task_receiver,
					sender: i_task_sender,
					primary: b_receiver_primary,
					task_ready: h_task_ready,
				}, (...a_args) => {
					// worker just made itself available
					this.worker_available(k_worker_receiver);

					// callback
					fk_result(...a_args);
				}, s_debug);
			});

			// schedule sender worker to relay data to receiver worker
			this.schedule(k_worker_sender, () => {
				k_worker_sender.relay(i_task_sender, k_channel.port_2(), String.fromCharCode(65+k_worker_receiver.id), s_debug);

				// no result needed from relay; worker is available after message posts
				setTimeout(() => {
					this.worker_available(k_worker_sender);
				}, 0);
			});
		}

		summon_workers(n_summons, fk_worker) {
			let a_workers = this.workers;
			let n_workers = this.limit;

			let c_summoned = 0;

			// start by looking for available workers
			let i_next_worker_summon = this.next_worker_summon;

			for(let i_worker=0; i_worker<n_workers && c_summoned<n_summons; i_worker++) {
				let i_worker_call = (i_worker+i_next_worker_summon) % n_workers;
				let k_worker = a_workers[i_worker_call];

				// worker available immediately
				if(k_worker.available) {
					// set next worker to summon
					this.next_worker_summon = i_worker_call + 1;

					// save summon index
					let i_subset = c_summoned++;

					// allow downstream handler to be established first
					setTimeout(() => {
						// console.info(' => '+k_worker.id);
						fk_worker(k_worker, i_subset);
					}, 0);
				}
			}

			// there are remaining summons
			if(c_summoned < n_summons) {
				// queue for notification when workers become available
				this.wait_list.push({
					tasks_remaining: n_summons - c_summoned,
					each(k_worker) {
						fk_worker(k_worker, c_summoned++);
					},
				});
			}
		}

		worker_available(k_worker) {
			// this worker has priority tasks waiting for it
			let a_queue = this.roster.get(k_worker);
			if(a_queue.length) {
				// fifo pop and call
				let fk_worker = a_queue.shift();
				fk_worker(k_worker);
			}
			// there is a wait list
			else if(this.wait_list.length) {
				// top of queue
				let h_patient = this.wait_list[0];

				// assign worker next task
				h_patient.each(k_worker);

				// this patient is satisfied; fifo pop
				if(0 === --h_patient.tasks_remaining) this.wait_list.shift();
			}
			// otherwise, free worker
			else {
				k_worker.available = true;
			}
		}
	};
};
