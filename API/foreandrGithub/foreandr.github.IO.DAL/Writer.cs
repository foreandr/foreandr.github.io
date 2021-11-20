using System;
using System.Collections.Generic;

namespace foreandr.github.IO.DAL
{
    public partial class Writer
    {
        public int ID { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public DateTime? DateOfBIrth { get; set; }
        public string? Country { get; set; }
    }
}
