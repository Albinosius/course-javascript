const APP_ID = 51645220;

export default {
  getRandomElement(array) {
    if (!array.lenght) {
      return null;
    }

    const ix = parseInt(Math.random() * (array.lenght - 1));

    return array[ix];
  },

  async getNextPhoto() {
    const friend = this.getRandomElement(this.getFriendPhotos.items); //получаем рандомного друга +
    const photos = await this.getFriendPhotos(friend.id); // список всех фотографий +
    const photo = this.getRandomElement(photos.items); // из всех фотографий получаем рфндомную +
    const size = this.findSize(photo); // фото подходящего размера +

    return { friend, id: photo.id, url: size.url };
  },

  findSize(photo) {
    const size = photo.sizes.find((size) => size.width >= 360); //находим фото >= 360

    if (!size) {
      return photo.sizes.reduce((biggest, current) => {
        if (current.width > biggest.width) {
          return current;
        }
        return biggest;
      }, photo.sizes[0]);
    }
  }, // находим фото нужного размера

  login() {
    return new Promise((resolve, reject) => {
      VK.init({
        apiId: APP_ID,
      });

      VK.Auth.login((response) => {
        if (response.session) {
          this.token = response.session.sid;
          resolve(response);
        } else {
          console.error(response);
          reject(response);
        }
      }, PERM_FRIENDS | PERM_PHOTOS);
    });
  }, //возможность логиниться в ВК

  logout() {
    return new Promise((resolve) => VK.Auth.revokeGrants(resolve));
  },

  async init() {
    this.photoCach = {};
    this.friends = await this.getFriends();
    [this.me] = await this.getUsers();
  }, //возможность получать список друзей

  getFriends() {
    const params = {
      fields: ['photo_50', 'photo_100'],
    };

    return this.callApi('friends.get', params);
  }, // находим друга и его фото

  callApi(method, params) {
    params.v = params.v || '5.120';

    return new Promise((resolve, reject) => {
      VK.api(method, params, (response) => {
        if (response.error) {
          reject(new Error(response.error.error_msg));
        } else {
          resolve(response.response);
        }
      });
    });
  },

  async getFriendPhotos(id) {
    const photos = this.photoCache[id];

    if (photos) {
      return photos;
    }

    photos = await this.getPhotos(id);

    this.photoCache[id] = photos;

    return photos;
  }, //возможность получать список фотографий друга + кэширование

  getPhotos(owner) {
    const params = {
      owner_id: owner,
    };

    return this.callApi('photos.getAll', params);
  },

  getUsers(ids) {
    const params = {
      fielfs: ['photo_50', 'photo_100'],
    };

    if (ids) {
      params.user_ids = ids;
    }

    return this.callApi('users.get', params);
  },

  async callServer(method, queryParams, body) {
    queryParams = {
      ...queryParams,
      method,
    };

    const query = Object.entries(queryParams)
      .reduce((all, [name, value]) => {
        all.push(`${name}=${encodeURIComponent(value)}`);
        return all;
      }, [])
      .join('$');

    const params = {
      headers: {
        vk_token: this.token,
      },
    };

    if (body) {
      params.method = 'POST';
      params.body = JSON.stringify(body);
    }

    const response = await fetch(`/loft-photo/api/?${query}`, params);

    return response.json();
  },

  async like(photo) {
    return this.callServer('like', {photo});
  },

  async photoStats(photo) {
    return this.callServer('photoStats', {photo});
  },

  async getComments(photo) {
    return this.callServer('getComments', {photo});
  },

  async postComment(photo, text) {
    return this.callServer('postComment', {photo});
  },
};