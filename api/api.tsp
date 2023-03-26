// ===============================================================
// TypeSpec definitions for Monitr API
// ===============================================================
import "@typespec/http";

using TypeSpec.Http;

@doc("This is the Monitr REST API")
@service({
  title: "Monitr API Service",
  version: "2023-03-12",
})
@server("http://localhost:8000", "Local dev server endpoint")

namespace BookStore;

model Monitor {
  @visibility("update")

}

@route("/books")
@tag("Books")
@doc("Methods for the books API")
interface BookAPI {
  @doc("Get a list of books")
  list(): Book[] | {
    @header contentType: "text/plain";
    @statusCode code: 500; 
    @body _: string;
  };

  @doc("Create a new book")
  create(...Book): Book | {
    @header contentType: "text/plain";
    @statusCode code: 400 | 409 | 500; 
    @body _: string;
  };

  @doc("Get a book by id")
  read(@path id: string): Book | {
    @header contentType: "text/plain";
    @statusCode code: 404 | 500; 
    @body _: string;
  };
}
