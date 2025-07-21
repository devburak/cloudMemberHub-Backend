class IService {
  async create(data) {
    throw new Error('Method not implemented');
  }

  async getById(id) {
    throw new Error('Method not implemented');
  }

  async getAll(options = {}) {
    throw new Error('Method not implemented');
  }

  async update(id, data) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async search(criteria, options = {}) {
    throw new Error('Method not implemented');
  }

  validate(data) {
    throw new Error('Method not implemented');
  }
}

module.exports = IService;