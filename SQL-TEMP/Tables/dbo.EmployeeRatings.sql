CREATE TABLE [dbo].[EmployeeRatings]
(
[EmployeeRatingsID] [int] NOT NULL IDENTITY(1, 1),
[EmployeeRatings] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[EmployeeRatings] ADD CONSTRAINT [CK_EmployeeRatings] CHECK (([EmployeeRatings]='Needs Major Improvement' OR [EmployeeRatings]='Below Average' OR [EmployeeRatings]='Above Average' OR [EmployeeRatings]='Outstanding'))
GO
ALTER TABLE [dbo].[EmployeeRatings] ADD CONSTRAINT [PK_EmployeeRatings] PRIMARY KEY CLUSTERED ([EmployeeRatingsID]) ON [PRIMARY]
GO
