
export class Foo extends App.Job {
  public async perform(state: any): Promise<any> {

    // ... do a batch of work ...

    return state;
  }
}
