
export class Foo extends App.Function {
  public async perform(): Promise<App.Response> {
    const response = new App.Response();
    response.status = 200;
    response.bodyJSON = {
      test: 'foo'
    };
    return response;
  }
}
