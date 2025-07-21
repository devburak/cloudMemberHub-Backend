class IRepository {
  async create(data) {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findOne(query) {
    throw new Error('Method not implemented');
  }

  async find(query, options = {}) {
    throw new Error('Method not implemented');
  }

  async updateById(id, data) {
    throw new Error('Method not implemented');
  }

  async updateOne(query, data) {
    throw new Error('Method not implemented');
  }

  async deleteById(id) {
    throw new Error('Method not implemented');
  }

  async deleteOne(query) {
    throw new Error('Method not implemented');
  }

  async count(query = {}) {
    throw new Error('Method not implemented');
  }

  async exists(query) {
    throw new Error('Method not implemented');
  }

  async aggregate(pipeline) {
    throw new Error('Method not implemented');
  }
}

module.exports = IRepository;