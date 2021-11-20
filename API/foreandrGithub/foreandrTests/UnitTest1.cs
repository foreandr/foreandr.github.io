using Xunit;
using foreandr.github.IO.DAL;
using System.Linq;

namespace foreandrTests
{
    public class UnitTest1
    {
        [Fact]
        public void Test1()
        {
            foreandrContext _db = new foreandrContext();

            var selectedBlog = from blogs in _db.BLOGs where blogs.ID == 1 select blogs; // COULD BE NULL
            Assert.True(selectedBlog.Count() > 0);
        }
        [Fact]
        public void Test2()
        {
            // lambda version
            foreandrContext _db = new foreandrContext();         
            BLOG selectedBlog = _db.BLOGs.FirstOrDefault(blog => blog.ID == 1); // COULD BE NULL
            Assert.True(selectedBlog.Title == "Andre" );
        }


        // more than one row
        [Fact]
        public void Test3()
        {

            foreandrContext _db = new foreandrContext();
            // If I keep this var instead of blog I have the queriable count method
            var selectedBlogs = _db.BLOGs.Where(blog => blog.Title == "Bernadette" || blog.Title == "Andre"); 
            Assert.True(selectedBlogs.Count() > 1);
        }
    }
}
