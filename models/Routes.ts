export interface PostBody {
  location: {
    id: number | string;
    name: string;
  }
  setType: {
    clear: boolean;
    isFirst: boolean;
  }
}