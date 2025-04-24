
class lock {
	constructor(b_unlocked=false) {
		Object.assign(this, {
			unlocked: b_unlocked,
			queue: [],
		});
	}

	wait(fk_unlock) {
		// already unlocked
		if(this.unlocked) {
			fk_unlock();
		}
		// currently locked, add to queue
		else {
			this.queue.push(fk_unlock);
		}
	}

	unlock() {
		// update state
		this.unlocked = true;

		// update field before executing callbacks
		let a_queue = this.queue;
		this.queue = [];

		// process callback queue
		a_queue.forEach((fk_unlock) => {
			fk_unlock();
		});
	}
}

class lockable {
	wait(z_key, z_unlock) {
		let fk_unlock = z_unlock;

		// unlock is another lock
		if('string' === typeof z_unlock) {
			fk_unlock = () => {
				this.unlock(z_unlock);
			};
		}
		// unlock is array of locks
		else if(Array.isArray(z_unlock)) {
			fk_unlock = () => {
				this.unlock(z_unlock);
			};
		}

		// series of keys to wait for
		if(Array.isArray(z_key)) {
			let i_key = 0;
			let n_keys = z_key.length;
			let f_next = () => {
				if(i_key === n_keys) fk_unlock();
				else this.wait(z_key[i_key++], f_next);
			};

			f_next();
		}
		// no such lock; but that's okay ;) create lock implicitly
		else if(!(z_key in this.locks)) {
			let k_lock = this.locks[z_key] = new lock();
			k_lock.wait(fk_unlock);
		}
		// add to wait queue
		else {
			this.locks[z_key].wait(fk_unlock);
		}
	}

	unlock(z_key) {
		// list of keys to unlock
		if(Array.isArray(z_key)) {
			z_key.forEach(z_key_ => this.unlock(z_key_));
		}
		// indivudal key
		else {
			// no such lock yet
			if(!(z_key in this.locks)) {
				this.locks[z_key] = new lock(true);
			}
			// unlock
			else {
				this.locks[z_key].unlock();
			}
		}
	}

}

module.exports = lockable;
