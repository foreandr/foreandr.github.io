using System;
using System.Collections.Generic;

// DAL COMMENTS
namespace foreandr.github.IO.DAL
{
    public partial class BlogPost
    {
        public int ID { get; set; }
        public int? WriterID { get; set; }
        public string? Title { get; set; }
        public DateTime? UploadDate { get; set; }
        public string? Contents { get; set; }

        public virtual Writer? Writer { get; set; }
    }
}
